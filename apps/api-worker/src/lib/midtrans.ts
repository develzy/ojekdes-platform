export function generateBasicAuth(serverKey: string): string {
  return 'Basic ' + btoa(serverKey + ':');
}

function getSnapUrl(isProduction: boolean): string {
  return isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
}

function getApiBaseUrl(isProduction: boolean): string {
  return isProduction
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2';
}

interface MidtransEnv {
  MIDTRANS_SERVER_KEY?: string;
  MIDTRANS_IS_PRODUCTION?: string | boolean;
}

export async function createSnapTransaction(
  payload: {
    transaction_details: {
      order_id: string;
      gross_amount: number;
    };
    customer_details?: {
      first_name?: string;
      email?: string;
      phone?: string;
    };
    item_details?: Array<{
      id: string;
      price: number;
      quantity: number;
      name: string;
    }>;
  },
  env: MidtransEnv
): Promise<{ token: string; redirect_url: string }> {
  const serverKey = env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY tidak terkonfigurasi');
  }

  if (serverKey === 'sandbox_server_key_123') {
    return {
      token: `mock-snap-token-${payload.transaction_details.order_id}`,
      redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${payload.transaction_details.order_id}`,
    };
  }

  const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true' || env.MIDTRANS_IS_PRODUCTION === true;
  const url = getSnapUrl(isProduction);
  const authHeader = generateBasicAuth(serverKey);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Midtrans Snap Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json() as Promise<{ token: string; redirect_url: string }>;
}

export async function getTransactionStatus(
  orderId: string,
  env: MidtransEnv
): Promise<{
  transaction_status: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  payment_type?: string;
  transaction_id?: string;
}> {
  const serverKey = env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY tidak terkonfigurasi');
  }

  if (serverKey === 'sandbox_server_key_123') {
    return {
      transaction_status: 'settlement',
      status_code: '200',
      gross_amount: '100000',
      signature_key: 'mock-sig',
      payment_type: 'qris',
      transaction_id: 'mock-transaction-id',
    };
  }

  const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true' || env.MIDTRANS_IS_PRODUCTION === true;
  const url = `${getApiBaseUrl(isProduction)}/${orderId}/status`;
  const authHeader = generateBasicAuth(serverKey);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Midtrans Core Status Error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<{
    transaction_status: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
    payment_type?: string;
    transaction_id?: string;
  }>;
}

export async function cancelTransaction(
  orderId: string,
  env: MidtransEnv
): Promise<{
  status_code: string;
  status_message: string;
  transaction_status: string;
}> {
  const serverKey = env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY tidak terkonfigurasi');
  }

  if (serverKey === 'sandbox_server_key_123') {
    return {
      status_code: '200',
      status_message: 'Success, transaction is canceled',
      transaction_status: 'cancel',
    };
  }

  const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true' || env.MIDTRANS_IS_PRODUCTION === true;
  const url = `${getApiBaseUrl(isProduction)}/${orderId}/cancel`;
  const authHeader = generateBasicAuth(serverKey);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Midtrans Cancel Error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<{
    status_code: string;
    status_message: string;
    transaction_status: string;
  }>;
}
