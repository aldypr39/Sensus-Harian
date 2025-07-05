import { dataStore, DataManager } from './dataManager.js';
// Rekapitulasi Manager - BARU
export const RekapitulasiManager = {
    updateHarian: (ruanganId, tanggal) => {
        console.log(`Updating rekapitulasi for ${tanggal}...`);
        
        const existing = dataStore.rekapitulasi_harian.find(r => 
            r.ruangan_id === ruanganId && r.tanggal === tanggal
        );

        // PERBAIKAN: Hitung pasien masuk dari KEDUA array (pasien aktif + riwayat)
        // Pasien masuk = pasien yang masuk pada tanggal ini (baik yang masih aktif maupun sudah keluar)
        const pasienMasukDariAktif = dataStore.pasien.filter(p =>
            p.ruangan_id === ruanganId && p.tgl_masuk.split('T')[0] === tanggal
        ).length;

        const pasienMasukDariRiwayat = dataStore.riwayat_pasien.filter(p =>
            p.ruangan_id === ruanganId && p.tgl_masuk.split('T')[0] === tanggal
        ).length;

        const totalPasienMasuk = pasienMasukDariAktif + pasienMasukDariRiwayat;

        // Hitung pasien keluar pada tanggal ini (hanya dari riwayat)
        const pasienKeluarHariIni = dataStore.riwayat_pasien.filter(p =>
            p.ruangan_id === ruanganId && p.tgl_keluar && p.tgl_keluar.split('T')[0] === tanggal
        ).length;

        // Hitung pasien awal (sisa kemarin)
        const yesterday = new Date(tanggal);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const yesterdayEntry = dataStore.rekapitulasi_harian.find(r => 
            r.ruangan_id === ruanganId && r.tanggal === yesterdayStr
        );
        const pasienAwal = yesterdayEntry ? yesterdayEntry.pasien_sisa : 0;

        // Hitung pasien sisa
        const pasienSisa = pasienAwal + totalPasienMasuk - pasienKeluarHariIni;

        const rekapData = {
            ruangan_id: ruanganId,
            tanggal: tanggal,
            pasien_awal: pasienAwal,
            pasien_masuk: totalPasienMasuk,
            pasien_keluar: pasienKeluarHariIni,
            pasien_sisa: pasienSisa,
            hari_perawatan: pasienSisa
        };

        console.log(`Rekap for ${tanggal}: awal=${pasienAwal}, masuk=${totalPasienMasuk} (aktif=${pasienMasukDariAktif} + riwayat=${pasienMasukDariRiwayat}), keluar=${pasienKeluarHariIni}, sisa=${pasienSisa}`);

        if (existing) {
            // Update existing entry
            Object.assign(existing, rekapData);
            console.log(`Updated existing rekapitulasi for ${tanggal}`);
        } else {
            // Create new entry
            dataStore.rekapitulasi_harian.push(rekapData);
            console.log(`Created new rekapitulasi for ${tanggal}`);
        }

        // Update tanggal berikutnya juga (karena pasien_awal berubah)
        const tomorrow = new Date(tanggal);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        // Cek apakah ada data untuk besok yang perlu diupdate
        const tomorrowEntry = dataStore.rekapitulasi_harian.find(r => 
            r.ruangan_id === ruanganId && r.tanggal === tomorrowStr
        );
        
        if (tomorrowEntry) {
            // Update pasien_awal untuk besok
            tomorrowEntry.pasien_awal = pasienSisa;
            tomorrowEntry.pasien_sisa = tomorrowEntry.pasien_awal + tomorrowEntry.pasien_masuk - tomorrowEntry.pasien_keluar;
            tomorrowEntry.hari_perawatan = tomorrowEntry.pasien_sisa;
            console.log(`Updated tomorrow (${tomorrowStr}) pasien_awal to ${pasienSisa}`);
        }

        DataManager.save();
    },

    getRekap: (ruanganId, bulan, tahun) => {
        return dataStore.rekapitulasi_harian.filter(r => {
            const tgl = new Date(r.tanggal);
            return r.ruangan_id === ruanganId && 
                   tgl.getMonth() === bulan - 1 && 
                   tgl.getFullYear() === tahun;
        });
    },

    generateRekapBulan: (ruanganId, bulan, tahun) => {
        const today = new Date();
        const targetDate = new Date(tahun, bulan - 1, 1); // First day of target month
        const lastDayOfMonth = new Date(tahun, bulan, 0).getDate();
        
        // Hanya tampilkan sampai hari ini jika bulan/tahun sama dengan sekarang
        const isCurrentMonth = (tahun === today.getFullYear() && bulan === today.getMonth() + 1);
        const maxDay = isCurrentMonth ? today.getDate() : lastDayOfMonth;
        
        const rekap = [];
        
        console.log(`Generating rekap for ${bulan}/${tahun}, showing days 1-${maxDay}`);

        // Ambil data real dari rekapitulasi_harian
        const realData = dataStore.rekapitulasi_harian.filter(r => {
            const tgl = new Date(r.tanggal);
            return r.ruangan_id === ruanganId && 
                   tgl.getMonth() === bulan - 1 && 
                   tgl.getFullYear() === tahun;
        });

        console.log(`Found ${realData.length} real entries for this period`);

        for (let day = 1; day <= maxDay; day++) {
            const tanggal = `${tahun}-${bulan.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            // Cek apakah ada data real untuk tanggal ini
            const realEntry = realData.find(r => r.tanggal === tanggal);
            
            if (realEntry) {
                // Gunakan data real
                rekap.push({
                    tanggal: tanggal,
                    pasien_awal: realEntry.pasien_awal,
                    masuk_baru: realEntry.pasien_masuk,
                    pindahan: 0,
                    jml_masuk: realEntry.pasien_masuk,
                    dipindahkan: 0,
                    keluar_hidup: realEntry.pasien_keluar,
                    dirujuk: 0,
                    aps: 0,
                    mati_kurang48_l: 0,
                    mati_kurang48_p: 0,
                    mati_lebih48_l: 0,
                    mati_lebih48_p: 0,
                    jml_mati: 0,
                    jml_keluar: realEntry.pasien_keluar,
                    lama_dirawat: realEntry.hari_perawatan,
                    in_out_sama: 0,
                    pasien_sisa: realEntry.pasien_sisa,
                    hari_perawatan: realEntry.hari_perawatan
                });
                console.log(`Added real data for ${tanggal}: masuk=${realEntry.pasien_masuk}, keluar=${realEntry.pasien_keluar}, sisa=${realEntry.pasien_sisa}`);
            } else {
                // Data kosong untuk tanggal yang belum ada aktivitas
                const pasienAwal = day === 1 ? 0 : (rekap[day-2]?.pasien_sisa || 0);
                
                rekap.push({
                    tanggal: tanggal,
                    pasien_awal: pasienAwal,
                    masuk_baru: 0,
                    pindahan: 0,
                    jml_masuk: 0,
                    dipindahkan: 0,
                    keluar_hidup: 0,
                    dirujuk: 0,
                    aps: 0,
                    mati_kurang48_l: 0,
                    mati_kurang48_p: 0,
                    mati_lebih48_l: 0,
                    mati_lebih48_p: 0,
                    jml_mati: 0,
                    jml_keluar: 0,
                    lama_dirawat: 0,
                    in_out_sama: 0,
                    pasien_sisa: pasienAwal,
                    hari_perawatan: pasienAwal
                });
                console.log(`Added empty data for ${tanggal}: sisa=${pasienAwal}`);
            }
        }

        console.log(`Generated ${rekap.length} days of data (real entries: ${realData.length})`);
        return rekap;
    }
};
