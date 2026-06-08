const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
    };
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(dataStr);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 8787,
      path: path,
      method: method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(dataStr);
    }
    req.end();
  });
}

async function registerOrLogin(phone, name, role, licenseNumber) {
  const regBody = {
    phone,
    password: 'password123',
    full_name: name,
    role,
    license_number: licenseNumber || undefined
  };

  let res = await request('POST', '/api/auth/register', regBody);
  if (res.statusCode === 201) {
    return res.body.data;
  }

  const loginBody = { phone, password: 'password123' };
  res = await request('POST', '/api/auth/login', loginBody);
  if (res.statusCode === 200) {
    return res.body.data;
  }

  throw new Error(`Auth failed for ${name}: ${JSON.stringify(res.body)}`);
}

function computeMidtransSignature(orderId, statusCode, grossAmount, serverKey) {
  const data = orderId + statusCode + grossAmount + serverKey;
  return crypto.createHash('sha512').update(data).digest('hex');
}

async function getDriverDetails(accessToken) {
  const res = await request('GET', '/api/auth/me', null, accessToken);
  if (res.statusCode !== 200) {
    console.error('[E2E error]', res.statusCode, res.body);
    throw new Error('Failed to get profile');
  }
  return res.body.data.role_details;
}

async function getWalletBalance(accessToken) {
  const res = await request('GET', '/api/wallet', null, accessToken);
  if (res.statusCode !== 200) {
    throw new Error(`Failed to get wallet: ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}

async function run() {
  console.log('==================================================');
  console.log('    WALLET & MIDTRANS INTEGRATION E2E TEST         ');
  console.log('==================================================\n');

  // Clean up database sessions to prevent interference from older driver sessions
  console.log('[Setup] Cleaning up database driver sessions...');
  try {
    execSync('npx.cmd wrangler d1 execute ojekdes-db --local --command "DELETE FROM driver_sessions; DELETE FROM driver_matching_queue; UPDATE drivers SET status = \'OFFLINE\';"', {
      cwd: './apps/api-worker',
      stdio: 'ignore'
    });
    console.log('[Setup] Database cleaned up successfully.');
  } catch (err) {
    console.error('[Setup] Warning: Database cleanup failed. Continuing...');
  }

  const randSuffix = Date.now().toString().slice(-6);
  const serverKey = 'sandbox_server_key_123';

  try {
    // ─── setup actors ────────────────────────────────────────────────────────
    console.log('[Setup] Registering actors...');
    const customerPhone = `081222${randSuffix}`;
    const driverPhone = `081223${randSuffix}`;
    const merchantPhone = `081224${randSuffix}`;
    const adminPhone = `081225${randSuffix}`;

    const customer = await registerOrLogin(customerPhone, 'Budi Customer', 'customer');
    const driver = await registerOrLogin(driverPhone, 'Joko Driver', 'driver', 'SIM-123456');
    const merchOwner = await registerOrLogin(merchantPhone, 'Asiong Merchant', 'customer');
    const admin = await registerOrLogin(adminPhone, 'Siti Admin', 'admin');

    const driverDetails = await getDriverDetails(driver.accessToken);
    const driverId = driverDetails.id;
    console.log(`[Setup] Driver ID is: ${driverId}`);

    // Set Driver Online and location (needed for matching engine)
    console.log('[Setup] Setting Joko Driver online at location...');
    await request('POST', '/api/drivers/online', {}, driver.accessToken);
    await request('POST', '/api/drivers/location', { latitude: -7.0, longitude: 110.0 }, driver.accessToken);

    // ─── SCENARIO A ──────────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('  SCENARIO A — CASHLESS RIDE FLOW');
    console.log('==================================================');

    // 1. Initial wallet check
    let wallet = await getWalletBalance(customer.accessToken);
    console.log(`Customer Wallet Balance: ${wallet.balance}, Hold Balance: ${wallet.hold_balance}`);
    if (wallet.balance !== 0) throw new Error('Initial wallet balance should be 0');

    // 2. Top up 100,000 via snap
    console.log('\n[Topup] Requesting topup of 100,000...');
    const topupRes = await request('POST', '/api/wallet/topup', { amount: 100000, payment_method: 'QRIS' }, customer.accessToken);
    if (topupRes.statusCode !== 200) {
      throw new Error(`Topup request failed: ${JSON.stringify(topupRes.body)}`);
    }
    const payment = topupRes.body.data.payment;
    const paymentCode = payment.payment_code;
    console.log(`Topup transaction created. Payment Code: ${paymentCode}`);

    // 3. Simulate Midtrans webhook
    console.log('[Topup] Simulating Midtrans settlement webhook...');
    const sig = computeMidtransSignature(paymentCode, '200', '100000', serverKey);
    const webhookRes = await request('POST', '/api/payments/webhook', {
      order_id: paymentCode,
      transaction_status: 'settlement',
      status_code: '200',
      gross_amount: '100000',
      signature_key: sig
    });
    if (webhookRes.statusCode !== 200) {
      throw new Error(`Webhook simulation failed: ${JSON.stringify(webhookRes.body)}`);
    }
    console.log('Webhook simulation accepted.');

    // 4. Verify customer balance
    wallet = await getWalletBalance(customer.accessToken);
    console.log(`Customer Wallet Balance after Topup: ${wallet.balance}`);
    if (wallet.balance !== 100000) throw new Error('Topup balance did not match');

    // 5. Verify topup ledger
    let historyRes = await request('GET', '/api/wallet/history', null, customer.accessToken);
    console.log('Wallet history count:', historyRes.body.data.length);
    const topupLedger = historyRes.body.data[0];
    console.log(`Topup Ledger type: ${topupLedger.reference_type}, amount: ${topupLedger.amount}, tx: ${topupLedger.transaction_type}`);
    if (topupLedger.reference_type !== 'TOPUP' || topupLedger.amount !== 100000 || topupLedger.transaction_type !== 'CREDIT') {
      throw new Error('Ledger entries do not match topup details');
    }

    // 6. Create RIDE order (Joko Driver should be automatically matched since he is online nearby)
    console.log('\n[Order] Customer creates RIDE order...');
    const orderPayload = {
      pickup_address: 'Balai Desa',
      pickup_latitude: -7.0,
      pickup_longitude: 110.0,
      destination_address: 'Pasar Desa',
      destination_latitude: -7.005,
      destination_longitude: 110.005,
      notes: 'Cashless payment test',
      payment_method: 'WALLET',
      estimated_price: 20000
    };
    const orderRes = await request('POST', '/api/orders/ride', orderPayload, customer.accessToken);
    if (orderRes.statusCode !== 201) {
      throw new Error(`RIDE order creation failed: ${JSON.stringify(orderRes.body)}`);
    }
    const order = orderRes.body.data;
    const orderId = order.id;
    console.log(`RIDE order created successfully. ID: ${orderId}`);

    // 7. Make payment using WALLET method
    console.log('[Payment] Hitting create payment (WALLET)...');
    const payRes = await request('POST', '/api/payments/create', {
      order_id: orderId,
      payment_method: 'WALLET',
      gross_amount: 20000
    }, customer.accessToken);
    if (payRes.statusCode !== 200) {
      throw new Error(`Payment failed: ${JSON.stringify(payRes.body)}`);
    }
    console.log('Payment successful. Customer wallet debited.');

    // 8. Verify customer wallet debited by 20,000
    wallet = await getWalletBalance(customer.accessToken);
    console.log(`Customer Wallet Balance after Ride Payment: ${wallet.balance}`);
    if (wallet.balance !== 80000) throw new Error('Customer wallet balance should be 80,000');

    // 9. Driver accepts matching broadcast
    console.log('[Order] Driver accepting matching broadcast...');
    const acceptRes = await request('POST', `/api/orders/${orderId}/accept`, {}, driver.accessToken);
    if (acceptRes.statusCode !== 200) {
      throw new Error(`Accept matching failed: ${JSON.stringify(acceptRes.body)}`);
    }
    console.log('Driver accepted broadcast order successfully.');

    // 10. Complete order status flow
    console.log('[Order] Driver completing order status flow...');
    await request('PATCH', `/api/orders/${orderId}/status`, { status: 'DRIVER_ARRIVED' }, driver.accessToken);
    await request('PATCH', `/api/orders/${orderId}/status`, { status: 'ON_TRIP' }, driver.accessToken);
    await request('PATCH', `/api/orders/${orderId}/status`, { status: 'DELIVERED' }, driver.accessToken);
    const completeRes = await request('PATCH', `/api/orders/${orderId}/status`, { status: 'COMPLETED' }, driver.accessToken);
    if (completeRes.statusCode !== 200) {
      throw new Error(`Failed to complete order: ${JSON.stringify(completeRes.body)}`);
    }
    console.log('Order completed.');

    // 11. Verify driver settlement (credited 80% of 20,000 = 16,000)
    let driverWallet = await getWalletBalance(driver.accessToken);
    console.log(`Driver Wallet Balance: ${driverWallet.balance}`);
    if (driverWallet.balance !== 16000) throw new Error('Driver settlement should be 16,000');

    // 12. Driver withdraw 15,000
    // Register mock merchant & bank account first to satisfy FK check
    console.log('\n[Withdrawal] Registering mock merchant and bank account...');
    const mReg = await request('POST', '/api/merchants', {
      category_id: 1,
      business_name: 'Driver Mock Store',
      owner_name: 'Joko Driver',
      phone: '085555555499'
    }, driver.accessToken);
    console.log('[Merchant Reg Response]', mReg.statusCode, JSON.stringify(mReg.body));
    if (mReg.statusCode !== 201) {
      throw new Error(`Merchant registration failed: ${JSON.stringify(mReg.body)}`);
    }
    const merchId = mReg.body.data.merchant_id;
    // Approve merchant
    await request('PATCH', `/api/merchants/${merchId}/status`, { status: 'APPROVED' }, admin.accessToken);
    // Add bank account
    const bReg = await request('POST', `/api/merchants/${merchId}/bank-accounts`, {
      bank_name: 'Bank Mandiri',
      account_number: '999999999',
      account_holder: 'Joko Driver',
      is_primary: 1
    }, driver.accessToken);
    if (bReg.statusCode !== 201) {
      throw new Error(`Bank account registration failed: ${JSON.stringify(bReg.body)}`);
    }
    const bankAccountId = bReg.body.data.account_id;
    console.log(`Mock Bank Account created with ID: ${bankAccountId}`);

    console.log('[Withdrawal] Requesting withdrawal of 15,000...');
    const wdRes = await request('POST', '/api/wallet/withdraw', {
      amount: 15000,
      bank_account_id: bankAccountId
    }, driver.accessToken);
    if (wdRes.statusCode !== 200) {
      throw new Error(`Withdrawal request failed: ${JSON.stringify(wdRes.body)}`);
    }
    const payoutId = wdRes.body.data.id;
    console.log(`Withdrawal request created. ID: ${payoutId}`);

    // Verify balance & hold_balance
    driverWallet = await getWalletBalance(driver.accessToken);
    console.log(`Driver Balance: ${driverWallet.balance}, Hold: ${driverWallet.hold_balance}`);
    if (driverWallet.balance !== 1000 || driverWallet.hold_balance !== 15000) {
      throw new Error('Hold balances do not match');
    }

    // 13. Admin Approve
    console.log('[Admin] Approving payout...');
    await request('PATCH', `/api/admin/payouts/${payoutId}/approve`, {}, admin.accessToken);

    // 14. Admin Paid
    console.log('[Admin] Marking payout as paid...');
    await request('PATCH', `/api/admin/payouts/${payoutId}/paid`, {}, admin.accessToken);

    // Verify final balances & ledger
    driverWallet = await getWalletBalance(driver.accessToken);
    console.log(`Driver Final Balance: ${driverWallet.balance}, Hold: ${driverWallet.hold_balance}`);
    if (driverWallet.balance !== 1000 || driverWallet.hold_balance !== 0) {
      throw new Error('Final balances do not match');
    }

    let drHistoryRes = await request('GET', '/api/wallet/history', null, driver.accessToken);
    const lastWdLedger = drHistoryRes.body.data[0];
    console.log(`Driver Ledger: type=${lastWdLedger.reference_type}, amount=${lastWdLedger.amount}, tx=${lastWdLedger.transaction_type}`);
    if (lastWdLedger.reference_type !== 'WITHDRAW' || lastWdLedger.amount !== 15000 || lastWdLedger.transaction_type !== 'DEBIT') {
      throw new Error('Ledger entry for withdrawal failed');
    }


    // ─── SCENARIO B ──────────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('  SCENARIO B — CASH RIDE FLOW');
    console.log('==================================================');

    // Ensure Joko driver is online again (accepting may have made him offline or busy depending on engine details, let's set online and location just to be safe)
    await request('POST', '/api/drivers/online', {}, driver.accessToken);
    await request('POST', '/api/drivers/location', { latitude: -7.0, longitude: 110.0 }, driver.accessToken);

    // 1. Customer creates RIDE order (CASH)
    console.log('[Order] Customer creates CASH order...');
    const cashOrderPayload = {
      pickup_address: 'Balai Desa',
      pickup_latitude: -7.0,
      pickup_longitude: 110.0,
      destination_address: 'Pasar Desa',
      destination_latitude: -7.005,
      destination_longitude: 110.005,
      notes: 'Cash payment test',
      payment_method: 'CASH',
      estimated_price: 20000
    };
    const cOrderRes = await request('POST', '/api/orders/ride', cashOrderPayload, customer.accessToken);
    const cashOrderId = cOrderRes.body.data.id;

    // Create payment transaction (CASH)
    const cPayRes = await request('POST', '/api/payments/create', {
      order_id: cashOrderId,
      payment_method: 'CASH',
      gross_amount: 20000
    }, customer.accessToken);
    if (cPayRes.statusCode !== 200) {
      throw new Error(`CASH payment creation failed: ${JSON.stringify(cPayRes.body)}`);
    }

    // 2. Driver accepts broadcast
    console.log('[Order] Driver accepting matching broadcast...');
    const cAcceptRes = await request('POST', `/api/orders/${cashOrderId}/accept`, {}, driver.accessToken);
    if (cAcceptRes.statusCode !== 200) {
      throw new Error(`Driver accept matching failed: ${JSON.stringify(cAcceptRes.body)}`);
    }

    // 3. Complete
    const s1 = await request('PATCH', `/api/orders/${cashOrderId}/status`, { status: 'DRIVER_ARRIVED' }, driver.accessToken);
    if (s1.statusCode !== 200) throw new Error(`Status DRIVER_ARRIVED failed: ${JSON.stringify(s1.body)}`);
    const s2 = await request('PATCH', `/api/orders/${cashOrderId}/status`, { status: 'ON_TRIP' }, driver.accessToken);
    if (s2.statusCode !== 200) throw new Error(`Status ON_TRIP failed: ${JSON.stringify(s2.body)}`);
    const s3 = await request('PATCH', `/api/orders/${cashOrderId}/status`, { status: 'DELIVERED' }, driver.accessToken);
    if (s3.statusCode !== 200) throw new Error(`Status DELIVERED failed: ${JSON.stringify(s3.body)}`);
    const s4 = await request('PATCH', `/api/orders/${cashOrderId}/status`, { status: 'COMPLETED' }, driver.accessToken);
    if (s4.statusCode !== 200) throw new Error(`Status COMPLETED failed: ${JSON.stringify(s4.body)}`);

    // 4. Verify negative driver balance (platform fee = 20% of 20,000 = 4,000 debited from driver wallet)
    driverWallet = await getWalletBalance(driver.accessToken);
    console.log(`Driver Wallet Balance after CASH Ride: ${driverWallet.balance}`);
    // Driver wallet was 1,000. 1,000 - 4,000 = -3,000
    if (driverWallet.balance !== -3000) {
      throw new Error(`Driver wallet balance should be -3000, got: ${driverWallet.balance}`);
    }
    console.log('Negative balance driver verified successfully!');


    // ─── SCENARIO C ──────────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('  SCENARIO C — MERCHANT SETTLEMENT');
    console.log('==================================================');

    // 1. Register merchant for merchOwner
    console.log('[Merchant] Registering merchant...');
    const merchReg = await request('POST', '/api/merchants', {
      category_id: 1,
      business_name: 'Soto Desa Maknyus',
      owner_name: 'Asiong Merchant',
      phone: '085555555401'
    }, merchOwner.accessToken);
    if (merchReg.statusCode !== 201) throw new Error('Merchant registration failed');
    const merchantId = merchReg.body.data.merchant_id;
    console.log(`Merchant registered. ID: ${merchantId}`);

    // Admin approves merchant
    await request('PATCH', `/api/merchants/${merchantId}/status`, { status: 'APPROVED' }, admin.accessToken);

    // 2. Add bank account
    console.log('[Merchant] Adding bank account...');
    const merchBank = await request('POST', `/api/merchants/${merchantId}/bank-accounts`, {
      bank_name: 'Bank Mandiri',
      account_number: '1234567890',
      account_holder: 'Asiong Merchant',
      is_primary: 1
    }, merchOwner.accessToken);
    const merchBankAccountId = merchBank.body.data.account_id;

    // 3. Create product
    console.log('[Merchant] Creating product...');
    const prodReg = await request('POST', '/api/merchant-products', {
      category_id: 1,
      sku: `SOTO-${randSuffix}`,
      name: 'Soto Ayam Jumbo',
      price: 50000,
      stock: 100
    }, merchOwner.accessToken);
    const productId = prodReg.body.data.product_id;
    console.log(`Product created. ID: ${productId}`);

    // 4. Customer creates merchant order
    console.log('[Merchant Order] Customer creates order...');
    const mOrderPayload = {
      merchant_id: merchantId,
      items: [{ product_id: productId, quantity: 1 }],
      delivery_fee: 10000
    };
    const mOrderRes = await request('POST', '/api/merchant-orders', mOrderPayload, customer.accessToken);
    if (mOrderRes.statusCode !== 201) {
      throw new Error(`Merchant order failed: ${JSON.stringify(mOrderRes.body)}`);
    }
    const mOrderId = mOrderRes.body.data.order_id;
    console.log(`Merchant order created. ID: ${mOrderId}`);

    // 5. Customer pays via WALLET (total total_amount = 50,000 + 10,000 = 60,000)
    console.log('[Merchant Order] Hitting create payment (WALLET)...');
    await request('POST', '/api/payments/create', {
      merchant_order_id: mOrderId,
      payment_method: 'WALLET',
      gross_amount: 60000
    }, customer.accessToken);

    // 6. Complete merchant order (status DELIVERED)
    console.log('[Merchant Order] Advancing status to DELIVERED...');
    await request('PATCH', `/api/merchant-orders/${mOrderId}/status`, { status: 'CONFIRMED' }, merchOwner.accessToken);
    await request('PATCH', `/api/merchant-orders/${mOrderId}/status`, { status: 'PREPARING' }, merchOwner.accessToken);
    await request('PATCH', `/api/merchant-orders/${mOrderId}/status`, { status: 'READY_FOR_PICKUP' }, merchOwner.accessToken);
    // As admin/driver update picked up and delivered
    await request('PATCH', `/api/merchant-orders/${mOrderId}/status`, { status: 'PICKED_UP' }, admin.accessToken);
    const delRes = await request('PATCH', `/api/merchant-orders/${mOrderId}/status`, { status: 'DELIVERED' }, admin.accessToken);
    if (delRes.statusCode !== 200) {
      throw new Error(`Failed to deliver merchant order: ${JSON.stringify(delRes.body)}`);
    }

    // 7. Verify merchant owner wallet (gets subtotal 50,000 - 10% = 45,000)
    const merchWallet = await getWalletBalance(merchOwner.accessToken);
    console.log(`Merchant Wallet Balance after settlement: ${merchWallet.balance}`);
    if (merchWallet.balance !== 45000) {
      throw new Error(`Merchant wallet should be 45,000, got: ${merchWallet.balance}`);
    }
    console.log('Merchant settlement verified successfully!');


    // ─── SCENARIO D ──────────────────────────────────────────────────────────
    console.log('\n==================================================');
    console.log('  SCENARIO D — REFUND');
    console.log('==================================================');

    // 1. Get initial customer balance
    wallet = await getWalletBalance(customer.accessToken);
    const balanceBeforeRefundOrder = wallet.balance;
    console.log(`Customer Wallet Balance: ${balanceBeforeRefundOrder}`);

    // 2. Create another RIDE order
    console.log('[Order] Creating refund test order...');
    const rOrderRes = await request('POST', '/api/orders/ride', {
      pickup_address: 'Balai Desa',
      pickup_latitude: -7.0,
      pickup_longitude: 110.0,
      destination_address: 'Pasar Desa',
      destination_latitude: -7.005,
      destination_longitude: 110.005,
      notes: 'Refund test',
      payment_method: 'WALLET',
      estimated_price: 20000
    }, customer.accessToken);
    const refOrderId = rOrderRes.body.data.id;

    // 3. Pay with WALLET
    console.log('[Payment] Paying with WALLET...');
    await request('POST', '/api/payments/create', {
      order_id: refOrderId,
      payment_method: 'WALLET',
      gross_amount: 20000
    }, customer.accessToken);

    wallet = await getWalletBalance(customer.accessToken);
    console.log(`Customer Wallet Balance (paid): ${wallet.balance}`);
    if (wallet.balance !== balanceBeforeRefundOrder - 20000) {
      throw new Error('Customer wallet should have decreased by 20,000');
    }

    // 4. Cancel order (triggers refund)
    console.log('[Order] Cancelling order to trigger refund...');
    const cancelRes = await request('PATCH', `/api/orders/${refOrderId}/cancel`, {
      reason: 'Batal karena salah alamat'
    }, customer.accessToken);
    if (cancelRes.statusCode !== 200) {
      throw new Error(`Cancel order failed: ${JSON.stringify(cancelRes.body)}`);
    }

    // 5. Verify customer wallet refunded back by 20,000
    wallet = await getWalletBalance(customer.accessToken);
    console.log(`Customer Wallet Balance (refunded): ${wallet.balance}`);
    if (wallet.balance !== balanceBeforeRefundOrder) {
      throw new Error(`Customer wallet should have returned to ${balanceBeforeRefundOrder}`);
    }

    // Verify ledger
    historyRes = await request('GET', '/api/wallet/history', null, customer.accessToken);
    const refundLedger = historyRes.body.data[0];
    console.log(`Refund Ledger: type=${refundLedger.reference_type}, amount=${refundLedger.amount}, tx=${refundLedger.transaction_type}`);
    if (refundLedger.reference_type !== 'REFUND' || refundLedger.amount !== 20000 || refundLedger.transaction_type !== 'CREDIT') {
      throw new Error('Ledger entry for refund failed');
    }

    console.log('\n==================================================');
    console.log('       ALL E2E SCENARIOS PASSED SUCCESSFULLY      ');
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ E2E Testing failed with error:');
    console.error(err);
    process.exit(1);
  }
}

run();
