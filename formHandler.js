import { Utils } from './utils.js';
import { DataManager, dataStore } from './dataManager.js';

// Form Handlers
export const FormHandler = {
    validateForm: (formData, rules) => {
        const errors = {};
        
        Object.keys(rules).forEach(field => {
            const value = formData[field];
            const rule = rules[field];
            
            if (rule.required && (!value || value.toString().trim() === '')) {
                errors[field] = `${rule.label} wajib diisi`;
            }
            
            if (value && rule.minLength && value.length < rule.minLength) {
                errors[field] = `${rule.label} minimal ${rule.minLength} karakter`;
            }
        });
        
        return errors;
    },

    handlePasienForm: (formData, isEdit = false, editId = null) => {
        const rules = {
            no_rm: { required: true, label: 'No. RM', minLength: 3 },
            nama_pasien: { required: true, label: 'Nama Pasien', minLength: 2 },
            jenis_kelamin: { required: true, label: 'Jenis Kelamin' },
            tgl_masuk: { required: true, label: 'Tanggal Masuk' },
            asal_pasien: { required: true, label: 'Asal Pasien' },
            no_tt: { required: true, label: 'No. Tempat Tidur' }
        };

        const errors = FormHandler.validateForm(formData, rules);
        
        if (Object.keys(errors).length > 0) {
            const errorMessage = Object.values(errors).join(', ');
            Utils.showNotification(errorMessage, 'error');
            return false;
        }

        const existingPasien = dataStore.pasien.find(p => 
            p.no_rm === formData.no_rm && (!isEdit || p.id !== editId)
        );
        
        if (existingPasien) {
            Utils.showNotification('No. RM sudah digunakan!', 'error');
            return false;
        }

        const pasienData = {
            no_rm: formData.no_rm,
            nama: formData.nama_pasien,
            jenis_kelamin: formData.jenis_kelamin,
            tgl_masuk: formData.tgl_masuk,
            asal_pasien: formData.asal_pasien,
            no_tt: formData.no_tt,
            ruangan_id: dataStore.current_user?.ruangan_id
        };

        if (isEdit && editId) {
            DataManager.pasien.update(editId, pasienData);
            Utils.showNotification('Data pasien berhasil diubah!');
        } else {
            DataManager.pasien.create(pasienData);
            
            const tempatTidur = dataStore.tempat_tidur.find(tt => tt.nomor_tt === formData.no_tt);
            if (tempatTidur) {
                tempatTidur.is_available = false;
            }
            
            Utils.showNotification('Pasien berhasil ditambahkan!');
        }

        return true;
    },

    handleKeluarPasienForm: (pasienId, formData) => {
        const rules = {
            tgl_keluar: { required: true, label: 'Tanggal Keluar' },
            keadaan_keluar: { required: true, label: 'Keadaan Keluar' }
        };

        const errors = FormHandler.validateForm(formData, rules);
        
        if (Object.keys(errors).length > 0) {
            const errorMessage = Object.values(errors).join(', ');
            Utils.showNotification(errorMessage, 'error');
            return false;
        }

        const result = DataManager.pasien.keluar(pasienId, formData);
        
        if (result) {
            Utils.showNotification('Pasien berhasil dikeluarkan!');
            return true;
        } else {
            Utils.showNotification('Gagal memproses pasien keluar!', 'error');
            return false;
        }
    },

    handleRuanganForm: (formData, isEdit = false, editId = null) => {
        const rules = {
            nama_ruangan: { required: true, label: 'Nama Ruangan', minLength: 3 },
            jumlah_tt: { required: true, label: 'Jumlah Tempat Tidur' }
        };

        const errors = FormHandler.validateForm(formData, rules);
        
        if (Object.keys(errors).length > 0) {
            const errorMessage = Object.values(errors).join(', ');
            Utils.showNotification(errorMessage, 'error');
            return false;
        }

        if (isEdit && editId) {
            DataManager.ruangan.update(editId, formData);
            Utils.showNotification('Ruangan berhasil diubah!');
        } else {
            DataManager.ruangan.create(formData);
            Utils.showNotification('Ruangan berhasil ditambahkan!');
        }

        return true;
    },

    handleAkunForm: (formData, isEdit = false, editId = null) => {
        const rules = {
            username: { required: true, label: 'Username', minLength: 3 },
            ruangan_id: { required: true, label: 'Ruangan' }
        };

        if (!isEdit) {
            rules.password = { required: true, label: 'Password', minLength: 6 };
            rules.password_confirmation = { required: true, label: 'Konfirmasi Password' };
        }

        const errors = FormHandler.validateForm(formData, rules);
        
        if (!isEdit && formData.password !== formData.password_confirmation) {
            errors.password_confirmation = 'Konfirmasi password tidak cocok';
        }
        
        if (Object.keys(errors).length > 0) {
            const errorMessage = Object.values(errors).join(', ');
            Utils.showNotification(errorMessage, 'error');
            return false;
        }

        if (isEdit && editId) {
            DataManager.users.update(editId, formData);
            Utils.showNotification('Akun berhasil diubah!');
        } else {
            DataManager.users.create(formData);
            Utils.showNotification('Akun berhasil ditambahkan!');
        }

        return true;
    }
};
