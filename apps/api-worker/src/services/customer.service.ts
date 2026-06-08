import { CustomerRepository } from '../repositories/customer.repository';

export class CustomerService {
  /**
   * List customer dengan pagination.
   */
  async list(page: number, limit: number, db: D1Database) {
    const customerRepo = new CustomerRepository(db);
    return customerRepo.list(page, limit);
  }

  /**
   * Ambil detail customer berdasarkan ID.
   */
  async getById(id: number, db: D1Database) {
    const customerRepo = new CustomerRepository(db);
    const customer = await customerRepo.findById(id);
    if (!customer) {
      throw new Error('Customer tidak ditemukan');
    }
    return customer;
  }
}
