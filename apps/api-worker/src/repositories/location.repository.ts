import { dbQuery, dbQueryFirst } from '../lib/db';

// ─── DB Row Types ─────────────────────────────────────────────────────────────

export interface DbVillage {
  id: number;
  district_id: number;
  village_code: string;
  village_name: string;
  latitude: number;
  longitude: number;
  is_active_service_area: number; // 0 | 1
  status: number; // 0 | 1
  created_at: string;
  updated_at: string;
}

export interface DbHamlet {
  id: number;
  village_id: number;
  hamlet_code: string;
  hamlet_name: string;
  latitude: number | null;
  longitude: number | null;
  status: number;
}

export interface DbServiceArea {
  id: number;
  village_id: number;
  zone_id: number | null;
  coverage_type: 'full' | 'pickup_only' | 'dropoff_only' | 'none';
  status: number;
  village_name: string;
  village_code: string;
  latitude: number;
  longitude: number;
  zone_name: string | null;
  zone_type: string | null;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class LocationRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Ambil semua desa, dengan filter area layanan aktif.
   */
  async getVillages(filters?: {
    isActiveServiceArea?: boolean;
  }): Promise<DbVillage[]> {
    const activeFilter =
      filters?.isActiveServiceArea !== undefined
        ? `AND is_active_service_area = ${filters.isActiveServiceArea ? 1 : 0}`
        : '';

    return dbQuery<DbVillage>(
      this.db,
      `SELECT * FROM villages WHERE status = 1 ${activeFilter} ORDER BY village_name ASC`,
      [],
    );
  }

  /**
   * Cari desa berdasarkan ID.
   */
  async getVillageById(id: number): Promise<DbVillage | null> {
    return dbQueryFirst<DbVillage>(
      this.db,
      `SELECT * FROM villages WHERE id = ? AND status = 1 LIMIT 1`,
      [id],
    );
  }

  /**
   * Ambil semua dusun/hamlet dalam desa tertentu.
   */
  async getHamletsByVillageId(villageId: number): Promise<DbHamlet[]> {
    return dbQuery<DbHamlet>(
      this.db,
      `SELECT * FROM hamlets WHERE village_id = ? AND status = 1 ORDER BY hamlet_name ASC`,
      [villageId],
    );
  }

  /**
   * Ambil semua area layanan aktif beserta info desa dan zona.
   */
  async getServiceAreas(): Promise<DbServiceArea[]> {
    return dbQuery<DbServiceArea>(
      this.db,
      `SELECT sa.*,
              v.village_name, v.village_code, v.latitude, v.longitude,
              z.zone_name, z.zone_type
       FROM service_areas sa
       JOIN villages v ON v.id = sa.village_id
       LEFT JOIN zones z ON z.id = sa.zone_id
       WHERE sa.status = 1 AND v.status = 1
       ORDER BY v.village_name ASC`,
      [],
    );
  }
}
