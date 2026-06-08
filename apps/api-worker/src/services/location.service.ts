import { LocationRepository } from '../repositories/location.repository';

export class LocationService {
  /**
   * Ambil semua desa dengan filter area layanan aktif secara opsional.
   */
  async getVillages(isActiveServiceArea: boolean | undefined, db: D1Database) {
    const locationRepo = new LocationRepository(db);
    return locationRepo.getVillages({ isActiveServiceArea });
  }

  /**
   * Cari desa berdasarkan ID.
   */
  async getVillageById(id: number, db: D1Database) {
    const locationRepo = new LocationRepository(db);
    const village = await locationRepo.getVillageById(id);
    if (!village) {
      throw new Error('Desa tidak ditemukan');
    }
    return village;
  }

  /**
   * Ambil semua dusun/hamlet berdasarkan ID desa.
   */
  async getHamletsByVillageId(villageId: number, db: D1Database) {
    const locationRepo = new LocationRepository(db);
    return locationRepo.getHamletsByVillageId(villageId);
  }

  /**
   * Ambil semua area layanan aktif.
   */
  async getServiceAreas(db: D1Database) {
    const locationRepo = new LocationRepository(db);
    return locationRepo.getServiceAreas();
  }
}
