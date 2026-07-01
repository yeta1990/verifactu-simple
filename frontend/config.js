// Veri*Factu — Configuration page logic

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('config-form');

    // Load current config and fill the form
    apiFetch('/api/config')
        .then((config) => {
            // debug: checkbox
            const debugEl = document.getElementById('debug');
            if (debugEl && config.debug !== undefined) {
                debugEl.checked = !!config.debug;
            }

            // string fields: text inputs
            const textFields = [
                'backend_url',
                'sqlite_path',
                'software_company_name',
                'software_company_nif',
                'software_name',
                'software_id',
                'software_version',
                'software_install_number',
                'verifactu_log_file',
                'verifactu_save_responses',
            ];
            textFields.forEach((key) => {
                const el = document.getElementById(key);
                if (el && config[key] !== undefined) {
                    el.value = config[key];
                }
            });

            // send_mode: select dropdown
            const sendModeEl = document.getElementById('send_mode');
            if (sendModeEl && config.send_mode !== undefined) {
                sendModeEl.value = config.send_mode;
            }
        })
        .catch((err) => {
            showToast('Error al cargar la configuración: ' + err.message, 'is-danger');
        });

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const payload = {
            debug: document.getElementById('debug').checked,
            backend_url: document.getElementById('backend_url').value,
            sqlite_path: document.getElementById('sqlite_path').value,
            software_company_name: document.getElementById('software_company_name').value,
            software_company_nif: document.getElementById('software_company_nif').value,
            software_name: document.getElementById('software_name').value,
            software_id: document.getElementById('software_id').value,
            software_version: document.getElementById('software_version').value,
            software_install_number: document.getElementById('software_install_number').value,
            verifactu_log_file: document.getElementById('verifactu_log_file').value,
            verifactu_save_responses: document.getElementById('verifactu_save_responses').value,
            send_mode: document.getElementById('send_mode').value,
        };

        apiFetch('/api/config', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
        .then(() => {
            showToast(
                'Configuración guardada. Reinicia el servidor para aplicar los cambios.',
                'is-success'
            );
        })
        .catch((err) => {
            showToast('Error al guardar la configuración: ' + err.message, 'is-danger');
        });
    });
});
