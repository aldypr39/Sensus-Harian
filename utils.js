import { dataStore } from './dataManager.js';
import { RekapitulasiManager } from './rekapManager.js';

// Utility Functions
export const Utils = {
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    formatDateTime: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    hitungLamaDirawat: (tglMasuk, tglKeluar = null) => {
        const masuk = new Date(tglMasuk);
        const keluar = tglKeluar ? new Date(tglKeluar) : new Date();
        const diffTime = Math.abs(keluar - masuk);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    },

    showNotification: (message, type = 'success') => {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
            font-family: 'Poppins', sans-serif;
            font-weight: 500;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    },

    updateDashboardStats: () => {
        const ruanganId = dataStore.current_user?.ruangan_id;
        if (!ruanganId) return;

        const ruangan = dataStore.ruangan.find(r => r.id === ruanganId);
        if (ruangan) {
            const pasienAktif = dataStore.pasien.filter(p => p.ruangan_id === ruanganId && p.status === 'aktif');
            const today = new Date().toISOString().split('T')[0];

            const pasienMasukHariIni = dataStore.pasien.filter(p =>
                p.ruangan_id === ruanganId && p.tgl_masuk.split('T')[0] === today
            ).length;

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const rekapKemarin = dataStore.rekapitulasi_harian.find(r =>
                r.ruangan_id === ruanganId && r.tanggal === yesterdayStr
            );
            
            const pasienSisaKemarin = rekapKemarin ? rekapKemarin.pasien_sisa : 0;

            const pasienKeluarHariIni = dataStore.riwayat_pasien.filter(p =>
                p.ruangan_id === ruanganId && p.tgl_keluar && p.tgl_keluar.split('T')[0] === today
            ).length;

            // Update cards - mulai dari 0
            const cards = document.querySelectorAll('.card-value');
            if (cards.length >= 5) {
                cards[0].textContent = `${ruangan.jumlah_tt - pasienAktif.length} / ${ruangan.jumlah_tt}`;
                cards[1].textContent = '0'; // Mulai dari 0
                cards[2].textContent = pasienMasukHariIni;
                cards[3].textContent = pasienKeluarHariIni;
                cards[4].textContent = pasienAktif.length;
            }

            // Update rekapitulasi harian untuk hari ini
            RekapitulasiManager.updateHarian(ruanganId, today);
            
            console.log(`Dashboard updated: ${pasienAktif.length} pasien aktif, ${ruangan.jumlah_tt - pasienAktif.length} bed tersedia`);
        }
    },

    // Fungsi baru untuk menghitung BOR
    hitungBOR: (ruanganId, bulan = null, tahun = null) => {
        const ruangan = dataStore.ruangan.find(r => r.id === ruanganId);
        if (!ruangan) return 0;

        const today = new Date();
        const targetMonth = bulan || (today.getMonth() + 1);
        const targetYear = tahun || today.getFullYear();
        
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0);

        console.log(`Calculating BOR for ${targetMonth}/${targetYear}`);

        // Hitung total hari rawat dalam periode berdasarkan data real
        let totalHariRawat = 0;
        
        // Pasien yang masih aktif (jika periode adalah bulan ini)
        if (targetMonth === today.getMonth() + 1 && targetYear === today.getFullYear()) {
            const pasienAktif = dataStore.pasien.filter(p => p.ruangan_id === ruanganId && p.status === 'aktif');
            pasienAktif.forEach(p => {
                const tglMasuk = new Date(p.tgl_masuk);
                const startCount = tglMasuk < startDate ? startDate : tglMasuk;
                const endCount = today > endDate ? endDate : today;
                if (startCount <= endCount) {
                    totalHariRawat += Math.ceil((endCount - startCount) / (1000 * 60 * 60 * 24)) + 1;
                }
            });
        }

        // Pasien yang sudah keluar dalam periode
        const riwayatDalamPeriode = dataStore.riwayat_pasien.filter(p => {
            if (p.ruangan_id !== ruanganId) return false;
            const tglKeluar = new Date(p.tgl_keluar);
            const tglMasuk = new Date(p.tgl_masuk);
            
            // Pasien yang keluar dalam periode atau sedang dirawat dalam periode
            return (tglKeluar >= startDate && tglKeluar <= endDate) || 
                   (tglMasuk <= endDate && tglKeluar >= startDate);
        });

        riwayatDalamPeriode.forEach(p => {
            const tglMasuk = new Date(p.tgl_masuk);
            const tglKeluar = new Date(p.tgl_keluar);
            const startCount = tglMasuk < startDate ? startDate : tglMasuk;
            const endCount = tglKeluar > endDate ? endDate : tglKeluar;
            if (startCount <= endCount) {
                totalHariRawat += Math.ceil((endCount - startCount) / (1000 * 60 * 60 * 24)) + 1;
            }
        });

        // Hitung BOR berdasarkan data real (tidak ada simulasi dummy)
        const jumlahHari = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const totalTempat = ruangan.jumlah_tt * jumlahHari;
        const bor = totalTempat > 0 ? (totalHariRawat / totalTempat) * 100 : 0;

        const result = Math.max(0, Math.min(100, Math.round(bor * 10) / 10));
        console.log(`BOR calculation: ${totalHariRawat} hari rawat / ${totalTempat} tempat = ${result}%`);
        return result;
    },

    // Fungsi untuk menghitung AvLOS
    hitungAvLOS: (ruanganId, bulan = null, tahun = null) => {
        const today = new Date();
        const targetMonth = bulan || (today.getMonth() + 1);
        const targetYear = tahun || today.getFullYear();
        
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0);

        const riwayatDalamPeriode = dataStore.riwayat_pasien.filter(p => {
            if (p.ruangan_id !== ruanganId) return false;
            const tglKeluar = new Date(p.tgl_keluar);
            return tglKeluar >= startDate && tglKeluar <= endDate;
        });

        if (riwayatDalamPeriode.length === 0) {
            return 0; // Tidak ada data, return 0
        }

        const totalLamaDirawat = riwayatDalamPeriode.reduce((total, p) => total + p.lama_dirawat, 0);
        const avlos = totalLamaDirawat / riwayatDalamPeriode.length;

        return Math.round(avlos * 10) / 10;
    }
};