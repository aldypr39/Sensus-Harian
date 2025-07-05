import { Utils } from './modules/utils.js';
import { DataManager, dataStore } from './modules/dataManager.js';
import { UIController } from './modules/uiController.js'; 
import { FormHandler } from './modules/formHandler.js';
import { RekapitulasiManager } from './modules/rekapManager.js';

// Main Application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing FRESH app...');
    
    // Check if this is first time or we want to reset
    const isFirstTime = !localStorage.getItem('sensus_harian_data');
    const forceReset = localStorage.getItem('force_reset') === 'true';
    
    if (isFirstTime || forceReset) {
        console.log('First time or force reset - clearing old data...');
        localStorage.removeItem('sensus_harian_data');
        localStorage.removeItem('force_reset');
        
        // Load fresh data
        DataManager.load();
        dataStore.current_user = dataStore.users.find(u => u.username === 'ruangmawar');
        
        // Save fresh data
        DataManager.save();
        
        console.log('Fresh data initialized:');
        console.log('- Ruang Mawar: 8 bed');
        console.log('- Pasien aktif: 0');
        console.log('- Riwayat: 0');
        console.log('- Tempat tidur tersedia:', dataStore.tempat_tidur.filter(tt => tt.ruangan_id === 1).length);
    } else {
        console.log('Loading existing data...');
        
        // Load existing data
        DataManager.load();
        dataStore.current_user = dataStore.users.find(u => u.username === 'ruangmawar');
        
        console.log('Existing data loaded:');
        console.log('- Pasien aktif:', dataStore.pasien.length);
        console.log('- Riwayat:', dataStore.riwayat_pasien.length);
        console.log('- Rekapitulasi entries:', dataStore.rekapitulasi_harian.length);
    }

    // Helper functions
    const openModal = (modal) => { 
        if (modal) {
            modal.classList.add('active');
        }
    };
    
    const closeModal = (modal) => { 
        if (modal) {
            modal.classList.remove('active');
        }
    };

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const currentTheme = localStorage.getItem('theme') || 'light-theme';
        document.body.classList.add(currentTheme);
        themeToggle.checked = currentTheme === 'dark-theme';
        
        themeToggle.addEventListener('change', function() {
            document.body.classList.toggle('dark-theme', this.checked);
            document.body.classList.toggle('light-theme', !this.checked);
            localStorage.setItem('theme', this.checked ? 'dark-theme' : 'light-theme');
        });
    }

    // Dashboard functionality
    const dashboardElement = document.querySelector('.tab-container');
    if (dashboardElement) {
        console.log('Dashboard detected, initializing...');
        
        // Tab navigation
        const tabLinks = dashboardElement.querySelectorAll('.tab-link');
        const tabContents = dashboardElement.querySelectorAll('.tab-content');
        
        tabLinks.forEach(clickedLink => {
            clickedLink.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = clickedLink.dataset.tab;
                const targetContent = document.getElementById(targetId);
                
                tabLinks.forEach(link => link.classList.remove('active'));
                clickedLink.classList.add('active');

                tabContents.forEach(content => content.classList.remove('active'));
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });

        // Search functionality
        const searchPasienAktifInput = document.getElementById('search-pasien-aktif');
        if (searchPasienAktifInput) {
            searchPasienAktifInput.addEventListener('keyup', (e) => {
                UIController.renderPasienAktif(e.target.value);
            });
        }

        const searchRiwayatPulangInput = document.getElementById('search-riwayat-pulang');
        const tanggalAwalInput = document.getElementById('filter-tanggal-awal');
        const tanggalAkhirInput = document.getElementById('filter-tanggal-akhir');

        const handleRiwayatFilterChange = () => {
            UIController.displayRiwayatPage();
        };

        if (searchRiwayatPulangInput) {
            searchRiwayatPulangInput.addEventListener('keyup', handleRiwayatFilterChange);
        }
        if (tanggalAwalInput && tanggalAkhirInput) {
            tanggalAwalInput.addEventListener('change', handleRiwayatFilterChange);
            tanggalAkhirInput.addEventListener('change', handleRiwayatFilterChange);
        }

        const tabelRiwayat = document.getElementById('pulang')?.querySelector('tbody');
        if (tabelRiwayat) {
            tabelRiwayat.addEventListener('click', (e) => {
                const cancelButton = e.target.closest('.btn-cancel-discharge');
                if (!cancelButton) return;

                const riwayatId = parseInt(cancelButton.dataset.id);
                const riwayatPasien = dataStore.riwayat_pasien.find(p => p.id === riwayatId);
                if (!riwayatPasien) return;

                const isConfirmed = confirm(`Anda yakin ingin membatalkan status keluar untuk pasien ${riwayatPasien.nama}? Pasien akan dikembalikan ke daftar aktif.`);
                if (isConfirmed) {
                    const result = DataManager.pasien.cancelDischarge(riwayatId);
                    if (result) {
                        Utils.showNotification(`Pasien ${result.nama} berhasil dikembalikan ke daftar aktif.`);
                        UIController.renderPasienAktif();
                        UIController.displayRiwayatPage();
                        Utils.updateDashboardStats();
                    } else {
                        Utils.showNotification('Gagal membatalkan status keluar.', 'error');
                    }
                }
            });
        }

        // Modal elements
        const modalTambahPasien = document.getElementById('modal-tambah-pasien');
        const modalKeluarPasien = document.getElementById('modal-keluar-pasien');
        const modalKonfirmasiHapus = document.getElementById('modal-konfirmasi-hapus');
        const formPasien = document.getElementById('form-pasien');

        let currentEditId = null;
        let currentDeleteId = null;

        // Tambah pasien button
        const btnTambahPasien = document.getElementById('btn-tambah-pasien');
        if (btnTambahPasien) {
            btnTambahPasien.addEventListener('click', () => {
                if (formPasien && modalTambahPasien) {
                    formPasien.reset();
                    modalTambahPasien.querySelector('h2').textContent = 'Form Tambah Pasien Masuk';
                    currentEditId = null;
                    
                    const now = new Date();
                    const dateTimeString = now.toISOString().slice(0, 16);
                    const tglMasukInput = document.getElementById('tgl_masuk');
                    if (tglMasukInput) {
                        tglMasukInput.value = dateTimeString;
                    }
                    
                    UIController.updateTempatTidurDropdown();
                    openModal(modalTambahPasien);
                    setTimeout(() => { document.getElementById('no_rm').focus(); }, 100);
                }
            });
        }

        // Form pasien submit
        if (formPasien) {
            formPasien.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const formData = new FormData(formPasien);
                const data = Object.fromEntries(formData);
                
                const isEdit = currentEditId !== null;
                const success = FormHandler.handlePasienForm(data, isEdit, currentEditId);
                
                // ↓↓↓ TAMBAHKAN BARIS INI UNTUK MELIHAT NILAINYA ↓↓↓
                console.log('Hasil dari handlePasienForm:', success);

                if (success) {
                    closeModal(modalTambahPasien);
                    UIController.renderPasienAktif();
                    Utils.updateDashboardStats();
                    UIController.updateTempatTidurDropdown();
                } else {
                    console.log('Success bernilai false, tidak melakukan apa-apa.');
                }
            });
        }

        // Table actions
        const tabelPasienAktif = document.getElementById('tabel-pasien-aktif');
        if (tabelPasienAktif) {
            tabelPasienAktif.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (!button) return;

                const pasienId = parseInt(button.dataset.id);
                const pasien = dataStore.pasien.find(p => p.id === pasienId);
                
                if (button.classList.contains('edit')) {
                    if (pasien && formPasien && modalTambahPasien) {
                        document.getElementById('no_rm').value = pasien.no_rm;
                        document.getElementById('nama_pasien').value = pasien.nama;
                        
                        const jenisKelaminRadio = document.querySelector(`input[name="jenis_kelamin"][value="${pasien.jenis_kelamin}"]`);
                        if (jenisKelaminRadio) {
                            jenisKelaminRadio.checked = true;
                        }
                        
                        document.getElementById('tgl_masuk').value = pasien.tgl_masuk;
                        document.getElementById('asal_pasien').value = pasien.asal_pasien;
                        
                        UIController.updateTempatTidurDropdown();
                        const noTTSelect = document.getElementById('no_tt');
                        if (noTTSelect) {
                            noTTSelect.dataset.currentValue = pasien.no_tt;
                            noTTSelect.value = pasien.no_tt;
                        }
                        
                        modalTambahPasien.querySelector('h2').textContent = 'Edit Data Pasien';
                        currentEditId = pasienId;
                        
                        openModal(modalTambahPasien);
                    }
                } else if (button.classList.contains('delete')) {
                    currentDeleteId = pasienId;
                    openModal(modalKonfirmasiHapus);
                } else if (button.classList.contains('discharge')) {
                    if (pasien && modalKeluarPasien) {
                        const pasienInfo = modalKeluarPasien.querySelector('.form-group p');
                        if (pasienInfo) {
                            pasienInfo.textContent = `${pasien.nama} (No. RM: ${pasien.no_rm})`;
                        }
                        
                        const now = new Date();
                        const dateTimeString = now.toISOString().slice(0, 16);
                        const tglKeluarInput = document.getElementById('tgl_keluar');
                        if (tglKeluarInput) {
                            tglKeluarInput.value = dateTimeString;
                        }
                        
                        const lamaRawatEl = modalKeluarPasien.querySelectorAll('.form-group p')[1];
                        if (lamaRawatEl) {
                            const lama = Utils.hitungLamaDirawat(pasien.tgl_masuk);
                            lamaRawatEl.textContent = `${lama} Hari (Otomatis)`;
                        }
                        
                        modalKeluarPasien.dataset.pasienId = pasienId;
                        openModal(modalKeluarPasien);
                    }
                }
            });
        }

        // Form keluar pasien
        const formKeluarPasien = modalKeluarPasien?.querySelector('form');
        if (formKeluarPasien) {
            formKeluarPasien.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const pasienId = parseInt(modalKeluarPasien.dataset.pasienId);
                const formData = new FormData(formKeluarPasien);
                const data = Object.fromEntries(formData);
                
                const success = FormHandler.handleKeluarPasienForm(pasienId, data);
                
                if (success) {
                    closeModal(modalKeluarPasien);
                    UIController.renderPasienAktif();
                    UIController.displayRiwayatPage();
                    Utils.updateDashboardStats();
                    UIController.updateTempatTidurDropdown();
                }
            });
        }

        // Keadaan keluar change handler
        const keadaanKeluarSelect = document.getElementById('keadaan_keluar');
        const tujuanRuanganGroup = document.getElementById('tujuan_ruangan_group');
        
        if (keadaanKeluarSelect && tujuanRuanganGroup) {
            keadaanKeluarSelect.addEventListener('change', (e) => {
                if (e.target.value === 'pindah') {
                    tujuanRuanganGroup.style.display = 'block';
                } else {
                    tujuanRuanganGroup.style.display = 'none';
                }
            });
        }

        // Konfirmasi hapus
        const btnKonfirmasiHapus = document.getElementById('btn-konfirmasi-hapus');
        if (btnKonfirmasiHapus) {
            btnKonfirmasiHapus.addEventListener('click', () => {
                if (currentDeleteId) {
                    const pasien = dataStore.pasien.find(p => p.id === currentDeleteId);
                    if (pasien) {
                        const tempatTidur = dataStore.tempat_tidur.find(tt => tt.nomor_tt === pasien.no_tt);
                        if (tempatTidur) {
                            tempatTidur.is_available = true;
                        }
                    }
                    
                    DataManager.pasien.delete(currentDeleteId);
                    closeModal(modalKonfirmasiHapus);
                    UIController.renderPasienAktif();
                    Utils.updateDashboardStats();
                    UIController.updateTempatTidurDropdown();
                    Utils.showNotification('Pasien berhasil dihapus!');
                    
                    currentDeleteId = null;
                }
            });
        }

        // Close modal buttons
        if (modalTambahPasien) {
            modalTambahPasien.querySelector('.close-btn')?.addEventListener('click', () => closeModal(modalTambahPasien));
        }
        if (modalKeluarPasien) {
            modalKeluarPasien.querySelector('.close-btn')?.addEventListener('click', () => closeModal(modalKeluarPasien));
        }
        if (modalKonfirmasiHapus) {
            modalKonfirmasiHapus.querySelector('.close-btn')?.addEventListener('click', () => closeModal(modalKonfirmasiHapus));
            document.getElementById('btn-batal-hapus')?.addEventListener('click', () => closeModal(modalKonfirmasiHapus));
        }

        // Initial render
        UIController.renderPasienAktif();
        UIController.displayRiwayatPage();
        Utils.updateDashboardStats();
    }

    // Rekapitulasi page
    if (window.location.pathname.includes('rekapitulasi')) {
        console.log('Rekapitulasi page detected');
        
        // Set default values terlebih dahulu
        const bulanSelect = document.getElementById('filter-bulan');
        const tahunSelect = document.getElementById('filter-tahun');
        const currentDate = new Date();
        
        if (bulanSelect && tahunSelect) {
            // Set nilai default
            bulanSelect.value = currentDate.getMonth() + 1;
            tahunSelect.value = currentDate.getFullYear();
            
            console.log(`Default filter set: bulan=${bulanSelect.value}, tahun=${tahunSelect.value}`);
        }
        
        // Event listener untuk filter button
        const filterBtn = document.querySelector('.filters .header-action-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Filter button clicked');
                
                if (bulanSelect && tahunSelect) {
                    let bulan = null;
                    let tahun = parseInt(tahunSelect.value);
                    
                    if (bulanSelect.value !== 'tahunan') {
                        bulan = parseInt(bulanSelect.value);
                    }
                    
                    console.log(`Applying filter: bulan=${bulan}, tahun=${tahun}`);
                    
                    if (bulan) {
                        UIController.renderRekapitulasi(bulan, tahun);
                    } else {
                        // Jika tahunan, render semua bulan (untuk saat ini gunakan bulan ini)
                        UIController.renderRekapitulasi(new Date().getMonth() + 1, tahun);
                    }
                    
                    Utils.showNotification(`Filter diterapkan: ${bulan ? `Bulan ${bulan}` : 'Tahunan'} ${tahun}`, 'success');
                }
            });
        }
        
        // Render dengan nilai default
        UIController.renderRekapitulasi();
    }

    // Laporan indikator page
    if (window.location.pathname.includes('laporan_indikator')) {
        console.log('Laporan indikator page detected');
        
        // Set default values terlebih dahulu
        const bulanSelect = document.getElementById('filter-bulan');
        const tahunSelect = document.getElementById('filter-tahun');
        const currentDate = new Date();
        
        if (bulanSelect && tahunSelect) {
            // Set nilai default
            bulanSelect.value = currentDate.getMonth() + 1;
            tahunSelect.value = currentDate.getFullYear();
            
            console.log(`Default filter indikator set: bulan=${bulanSelect.value}, tahun=${tahunSelect.value}`);
        }
        
        // Event listener untuk filter button
        const filterBtn = document.querySelector('.filters .header-action-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Filter indikator button clicked');
                
                if (bulanSelect && tahunSelect) {
                    let bulan = null;
                    let tahun = parseInt(tahunSelect.value);
                    
                    if (bulanSelect.value !== 'tahunan') {
                        bulan = parseInt(bulanSelect.value);
                    }
                    
                    console.log(`Applying indikator filter: bulan=${bulan}, tahun=${tahun}`);
                    
                    if (bulan) {
                        UIController.renderIndikator(bulan, tahun);
                    } else {
                        // Jika tahunan, gunakan bulan ini
                        UIController.renderIndikator(new Date().getMonth() + 1, tahun);
                    }
                    
                    Utils.showNotification(`Filter indikator diterapkan: ${bulan ? `Bulan ${bulan}` : 'Tahunan'} ${tahun}`, 'success');
                }
            });
        }
        
        // Render dengan nilai default
        UIController.renderIndikator();
    }

    // Admin functionality
    const adminContent = document.querySelector('.admin-content');
    if (adminContent) {
        console.log('Admin page detected');
        
        if (window.location.pathname.includes('admin_ruangan')) {
            console.log('Admin ruangan page');
            const modalRuangan = document.getElementById('modal-ruangan');
            const btnTambahRuangan = document.getElementById('btn-tambah-ruangan');
            const formRuangan = modalRuangan?.querySelector('form');
            let currentEditRuanganId = null;

            if (btnTambahRuangan) {
                btnTambahRuangan.addEventListener('click', () => {
                    if (formRuangan && modalRuangan) {
                        formRuangan.reset();
                        modalRuangan.querySelector('h2').textContent = 'Tambah Ruangan Baru';
                        currentEditRuanganId = null;
                        openModal(modalRuangan);
                    }
                });
            }

            if (formRuangan) {
                formRuangan.addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const formData = new FormData(formRuangan);
                    const data = Object.fromEntries(formData);
                    
                    const isEdit = currentEditRuanganId !== null;
                    const success = FormHandler.handleRuanganForm(data, isEdit, currentEditRuanganId);
                    
                    if (success) {
                        closeModal(modalRuangan);
                        UIController.renderRuanganAdmin();
                    }
                });
            }

            const tableBody = adminContent.querySelector('table tbody');
            if (tableBody) {
                tableBody.addEventListener('click', (e) => {
                    const button = e.target.closest('button');
                    if (!button) return;

                    const ruanganId = parseInt(button.dataset.id);
                    const ruangan = dataStore.ruangan.find(r => r.id === ruanganId);
                    
                    if (button.classList.contains('btn-edit')) {
                        if (ruangan && formRuangan && modalRuangan) {
                            document.getElementById('nama-ruangan').value = ruangan.nama;
                            document.getElementById('jumlah-tt').value = ruangan.jumlah_tt;
                            modalRuangan.querySelector('h2').textContent = 'Edit Ruangan';
                            currentEditRuanganId = ruanganId;
                            openModal(modalRuangan);
                        }
                    } else if (button.classList.contains('btn-delete')) {
                        if (confirm('Yakin ingin menghapus ruangan ini?')) {
                            DataManager.ruangan.delete(ruanganId);
                            UIController.renderRuanganAdmin();
                            Utils.showNotification('Ruangan berhasil dihapus!');
                        }
                    }
                });
            }

            modalRuangan?.querySelector('.close-btn')?.addEventListener('click', () => closeModal(modalRuangan));
            UIController.renderRuanganAdmin();
        }

        if (window.location.pathname.includes('admin_akun')) {
            console.log('Admin akun page');
            const modalAkun = document.getElementById('modal-akun');
            const btnTambahAkun = document.getElementById('btn-tambah-akun');
            const formAkun = modalAkun?.querySelector('form');
            let currentEditAkunId = null;

            if (btnTambahAkun) {
                btnTambahAkun.addEventListener('click', () => {
                    if (formAkun && modalAkun) {
                        formAkun.reset();
                        modalAkun.querySelector('h2').textContent = 'Buat Akun Ruangan Baru';
                        currentEditAkunId = null;
                        UIController.updateRuanganDropdown();
                        openModal(modalAkun);
                    }
                });
            }

            if (formAkun) {
                formAkun.addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const formData = new FormData(formAkun);
                    const data = Object.fromEntries(formData);
                    
                    const isEdit = currentEditAkunId !== null;
                    const success = FormHandler.handleAkunForm(data, isEdit, currentEditAkunId);
                    
                    if (success) {
                        closeModal(modalAkun);
                        UIController.renderAkunAdmin();
                    }
                });
            }

            const tableBody = adminContent.querySelector('table tbody');
            if (tableBody) {
                tableBody.addEventListener('click', (e) => {
                    const button = e.target.closest('button');
                    if (!button) return;

                    const userId = parseInt(button.dataset.id);
                    const user = dataStore.users.find(u => u.id === userId);
                    
                    if (button.classList.contains('btn-edit')) {
                        if (user && formAkun && modalAkun) {
                            document.getElementById('username-akun').value = user.username;
                            document.getElementById('pilih-ruangan').value = user.ruangan_id;
                            modalAkun.querySelector('h2').textContent = 'Edit Akun';
                            currentEditAkunId = userId;
                            UIController.updateRuanganDropdown();
                            openModal(modalAkun);
                        }
                    } else if (button.classList.contains('btn-delete')) {
                        if (confirm('Yakin ingin menghapus akun ini?')) {
                            DataManager.users.delete(userId);
                            UIController.renderAkunAdmin();
                            Utils.showNotification('Akun berhasil dihapus!');
                        }
                    }
                });
            }

            modalAkun?.querySelector('.close-btn')?.addEventListener('click', () => closeModal(modalAkun));
            UIController.renderAkunAdmin();
        }
    }

    // Zoom functionality untuk rekapitulasi
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    
    if (zoomInBtn && zoomOutBtn && zoomResetBtn) {
        let currentZoom = 100;
        const table = document.querySelector('.table-wrapper table');
        
        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(currentZoom + 10, 150);
            if (table) {
                table.style.transform = `scale(${currentZoom / 100})`;
            }
            zoomResetBtn.textContent = `${currentZoom}%`;
        });
        
        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(currentZoom - 10, 50);
            if (table) {
                table.style.transform = `scale(${currentZoom / 100})`;
            }
            zoomResetBtn.textContent = `${currentZoom}%`;
        });
        
        zoomResetBtn.addEventListener('click', () => {
            currentZoom = 100;
            if (table) {
                table.style.transform = `scale(1)`;
            }
            zoomResetBtn.textContent = `${currentZoom}%`;
        });
    }

    // Global modal close on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    

    console.log('Fresh app initialization complete');
});

// Fitur: Menutup semua modal aktif dengan tombol ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Export untuk debugging
window.SensusHarian = {
    DataManager,
    UIController,
    FormHandler,
    Utils,
    RekapitulasiManager,
    dataStore,
    
    // Helper functions untuk debugging
    debug: {
        testFilter: (bulan, tahun) => {
            console.log(`Testing filter for ${bulan}/${tahun}`);
            if (window.location.pathname.includes('rekapitulasi')) {
                UIController.renderRekapitulasi(bulan, tahun);
            } else if (window.location.pathname.includes('laporan_indikator')) {
                UIController.renderIndikator(bulan, tahun);
            }
        },
        
        checkElements: () => {
            console.log('Checking filter elements...');
            const bulanSelect = document.getElementById('filter-bulan');
            const tahunSelect = document.getElementById('filter-tahun');
            const filterBtn = document.querySelector('.filters .header-action-btn');
            
            console.log('Bulan select:', bulanSelect);
            console.log('Tahun select:', tahunSelect);
            console.log('Filter button:', filterBtn);
            
            if (bulanSelect) console.log('Bulan value:', bulanSelect.value);
            if (tahunSelect) console.log('Tahun value:', tahunSelect.value);
        },
        
        simulateClick: () => {
            console.log('Simulating filter button click...');
            const filterBtn = document.querySelector('.filters .header-action-btn');
            if (filterBtn) {
                filterBtn.click();
            } else {
                console.log('Filter button not found!');
            }
        },
        
        checkTempatTidur: () => {
            console.log('Checking tempat tidur...');
            const ruanganId = dataStore.current_user?.ruangan_id || 1;
            const available = dataStore.tempat_tidur.filter(tt => tt.ruangan_id === ruanganId && tt.is_available);
            console.log('Available beds:', available);
            
            const dropdown = document.getElementById('no_tt');
            if (dropdown) {
                console.log('Dropdown options:', dropdown.options.length);
                for (let i = 0; i < dropdown.options.length; i++) {
                    console.log(`Option ${i}:`, dropdown.options[i].value);
                }
            }
        },
        
        resetData: () => {
            console.log('Resetting all data...');
            localStorage.setItem('force_reset', 'true');
            localStorage.removeItem('sensus_harian_data');
            location.reload();
        },
        
        showCurrentData: () => {
            console.log('=== CURRENT DATA STATUS ===');
            console.log('Pasien aktif:', dataStore.pasien.length);
            console.log('Riwayat pasien:', dataStore.riwayat_pasien.length);
            console.log('Rekapitulasi entries:', dataStore.rekapitulasi_harian.length);
            console.log('Tempat tidur tersedia:', dataStore.tempat_tidur.filter(tt => tt.ruangan_id === 1 && tt.is_available).length);
            console.log('=== DETAILED DATA ===');
            console.log('Pasien:', dataStore.pasien);
            console.log('Riwayat:', dataStore.riwayat_pasien);
            console.log('Rekapitulasi:', dataStore.rekapitulasi_harian);
        },
        
        updateAllDatesRekapitulasi: () => {
            console.log('Updating all dates rekapitulasi...');
            
            // Clear existing rekapitulasi
            dataStore.rekapitulasi_harian = [];
            
            // Get all unique dates from pasien and riwayat
            const allDates = new Set();
            
            // Dates from pasien
            dataStore.pasien.forEach(p => {
                const date = p.tgl_masuk.split('T')[0];
                allDates.add(date);
            });
            
            // Dates from riwayat
            dataStore.riwayat_pasien.forEach(p => {
                if (p.tgl_masuk) {
                    const masukDate = p.tgl_masuk.split('T')[0];
                    allDates.add(masukDate);
                }
                if (p.tgl_keluar) {
                    const keluarDate = p.tgl_keluar.split('T')[0];
                    allDates.add(keluarDate);
                }
            });
            
            // Sort dates
            const sortedDates = Array.from(allDates).sort();
            
            // Update rekapitulasi for all dates in order
            sortedDates.forEach(date => {
                RekapitulasiManager.updateHarian(1, date); // Assuming ruangan_id = 1
            });
            
            console.log(`Updated rekapitulasi for ${sortedDates.length} dates:`, sortedDates);
        },
    }
};