class IntegrationsApiModel {
    constructor() {
        this.apiBaseUrl = window.location.origin.includes('localhost:8080')
            ? 'http://localhost:3000'
            : window.location.origin;
    }

    async login(credentials) {
        return fetch(`${this.apiBaseUrl}/api/client-auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
    }

    async getSession(token) {
        return this.authenticatedFetch('/api/client-auth/session', token);
    }

    async logout(token) {
        return this.authenticatedFetch('/api/client-auth/logout', token, { method: 'POST' });
    }

    async createIntegration(token, payload) {
        return this.authenticatedFetch('/api/client-integrations', token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    async updateIntegration(token, integrationId, payload) {
        return this.authenticatedFetch(`/api/client-integrations/${integrationId}`, token, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    async deleteIntegration(token, integrationId) {
        return this.authenticatedFetch(`/api/client-integrations/${integrationId}`, token, {
            method: 'DELETE'
        });
    }

    async getIntegrationsReport(token) {
        return this.authenticatedFetch('/api/client-integrations/reports', token);
    }

    async saveEvolutionCredentials(token, integrationId, apiKey) {
        return this.authenticatedFetch(`/api/client-integrations/${integrationId}/evolution/credentials`, token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey })
        });
    }

    async listEvolutionInstances(token, integrationId) {
        return this.authenticatedFetch(`/api/client-integrations/${integrationId}/evolution/instances`, token);
    }

    async createEvolutionInstance(token, integrationId, payload) {
        return this.authenticatedFetch(`/api/client-integrations/${integrationId}/evolution/instances`, token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    async updateEvolutionInstance(token, integrationId, instanceName, payload) {
        return this.authenticatedFetch(`/api/client-integrations/${integrationId}/evolution/instances/${encodeURIComponent(instanceName)}`, token, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    async deleteEvolutionInstance(token, integrationId, instanceName) {
        return this.authenticatedFetch(`/api/client-integrations/${integrationId}/evolution/instances/${encodeURIComponent(instanceName)}`, token, {
            method: 'DELETE'
        });
    }

    async getEvolutionQrCode(token, integrationId, instanceName) {
        return this.authenticatedFetch(`/api/client-integrations/${integrationId}/evolution/instances/${encodeURIComponent(instanceName)}/qrcode`, token);
    }

    async proxyEvolutionConfig(token, integrationId, payload) {
        return this.authenticatedFetch(`/api/client-integrations/${integrationId}/evolution/proxy`, token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    authenticatedFetch(path, token, options = {}) {
        const headers = {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        };

        return fetch(`${this.apiBaseUrl}${path}`, {
            ...options,
            headers
        });
    }
}

class IntegrationsPortalView {
    constructor() {
        this.loginWrapper = document.getElementById('client-login-wrapper');
        this.loginForm = document.getElementById('client-login-form');
        this.loginStatus = document.getElementById('client-login-status');
        this.clientAreaContent = document.getElementById('client-area-content');
        this.integrationForm = document.getElementById('client-integration-form');
        this.integrationStatus = document.getElementById('client-security-result');
        this.refreshButton = document.getElementById('refresh-admin-clients');
        this.logoutButton = document.getElementById('client-logout');
        this.logoutTopButton = document.getElementById('client-logout-top');
        this.logoutGlobalButton = document.getElementById('client-logout-global');
        this.metricsContainer = document.getElementById('portal-metrics');
        this.reportsContainer = document.getElementById('portal-reports');
        this.integrationsContainer = document.getElementById('admin-clients-list');

        this.integrationSelect = document.getElementById('selected-integration');
        this.integrationEditor = document.getElementById('integration-editor');
        this.credentialsForm = document.getElementById('evolution-credentials-form');
        this.credentialsStatus = document.getElementById('credentials-status');

        this.updateIntegrationButton = document.getElementById('btn-update-integration');
        this.deleteIntegrationButton = document.getElementById('btn-delete-integration');

        this.instanceForm = document.getElementById('instance-form');
        this.instanceStatus = document.getElementById('instance-status');
        this.instanceOutput = document.getElementById('instance-output');
        this.qrcodePreview = document.getElementById('qrcode-preview');

        this.createButton = document.getElementById('btn-create-instance');
        this.updateButton = document.getElementById('btn-update-instance');
        this.deleteButton = document.getElementById('btn-delete-instance');
        this.qrButton = document.getElementById('btn-qrcode-instance');
        this.listButton = document.getElementById('btn-list-instances');

        this.advancedForm = document.getElementById('advanced-config-form');
        this.advancedOutput = document.getElementById('advanced-output');
    }

    bindLogin(handler) { this.loginForm?.addEventListener('submit', handler); }
    bindIntegrationSubmit(handler) { this.integrationForm?.addEventListener('submit', handler); }
    bindRefresh(handler) { this.refreshButton?.addEventListener('click', handler); }
    bindLogout(handler) {
        this.logoutButton?.addEventListener('click', handler);
        this.logoutTopButton?.addEventListener('click', handler);
        this.logoutGlobalButton?.addEventListener('click', handler);
    }
    bindCredentialSubmit(handler) { this.credentialsForm?.addEventListener('submit', handler); }
    bindAdvancedSubmit(handler) { this.advancedForm?.addEventListener('submit', handler); }
    bindIntegrationEditorChange(handler) { this.integrationEditor?.addEventListener('change', handler); }
    bindIntegrationUpdate(handler) { this.updateIntegrationButton?.addEventListener('click', handler); }
    bindIntegrationDelete(handler) { this.deleteIntegrationButton?.addEventListener('click', handler); }

    bindInstanceActions(actions) {
        this.createButton?.addEventListener('click', actions.onCreate);
        this.updateButton?.addEventListener('click', actions.onUpdate);
        this.deleteButton?.addEventListener('click', actions.onDelete);
        this.qrButton?.addEventListener('click', actions.onQrCode);
        this.listButton?.addEventListener('click', actions.onList);
    }

    setLocked(isLocked) {
        this.loginWrapper?.classList.toggle('is-hidden', !isLocked);
        this.clientAreaContent?.classList.toggle('is-locked', isLocked);
        this.logoutGlobalButton?.classList.toggle('is-visible', !isLocked);
    }

    setStatus(element, message, type) {
        if (!element) return;
        element.textContent = message;
        element.classList.remove('is-error', 'is-success');
        if (type === 'error') element.classList.add('is-error');
        if (type === 'success') element.classList.add('is-success');
    }

    getLoginCredentials() {
        const formData = new FormData(this.loginForm);
        return {
            username: (formData.get('username') || '').toString().trim(),
            password: (formData.get('password') || '').toString()
        };
    }

    getIntegrationPayload() {
        const formData = new FormData(this.integrationForm);
        return {
            companyName: (formData.get('companyName') || '').toString().trim(),
            contactEmail: (formData.get('contactEmail') || '').toString().trim(),
            n8nEndpoint: (formData.get('n8nEndpoint') || '').toString().trim(),
            evolutionEndpoint: (formData.get('evolutionEndpoint') || '').toString().trim(),
            securityLevel: (formData.get('securityLevel') || '').toString().trim()
        };
    }

    getEditingIntegrationId() {
        return (this.integrationEditor?.value || '').trim();
    }

    getSelectedIntegrationId() {
        return (this.integrationSelect?.value || '').trim();
    }

    fillIntegrationForm(integration) {
        this.integrationForm.companyName.value = integration?.companyName || '';
        this.integrationForm.contactEmail.value = integration?.contactEmail || '';
        this.integrationForm.n8nEndpoint.value = integration?.n8nEndpoint || '';
        this.integrationForm.evolutionEndpoint.value = integration?.evolutionEndpoint || '';
        this.integrationForm.securityLevel.value = integration?.securityLevel || '';
        this.integrationForm.companyId.value = integration?.companyId || 'Será preenchido após salvar';
    }

    resetIntegrationForm() {
        this.integrationForm.reset();
        this.integrationForm.companyId.value = 'Será preenchido após salvar';
        if (this.integrationEditor) this.integrationEditor.value = '';
    }

    getCredentialsPayload() {
        const formData = new FormData(this.credentialsForm);
        return {
            integrationId: (formData.get('integrationId') || '').toString().trim(),
            apiKey: (formData.get('apiKey') || '').toString().trim()
        };
    }

    getInstancePayload() {
        const formData = new FormData(this.instanceForm);
        return {
            instanceName: (formData.get('instanceName') || '').toString().trim(),
            token: (formData.get('token') || '').toString().trim(),
            qrcode: formData.get('qrcode') === 'on',
            readMessages: formData.get('readMessages') === 'on',
            alwaysOnline: formData.get('alwaysOnline') === 'on',
            syncFullHistory: formData.get('syncFullHistory') === 'on'
        };
    }

    getAdvancedPayload() {
        const formData = new FormData(this.advancedForm);
        return {
            method: (formData.get('method') || 'GET').toString(),
            path: (formData.get('path') || '/').toString().trim(),
            payloadRaw: (formData.get('payload') || '').toString().trim()
        };
    }

    renderMetrics(metrics = {}) {
        this.metricsContainer.innerHTML = `
            <div class="metric-card"><h4>${metrics.totalIntegrations || 0}</h4><p>Integrações</p></div>
            <div class="metric-card"><h4>${metrics.totalEvents || 0}</h4><p>Eventos de uso</p></div>
            <div class="metric-card"><h4>${metrics.strictSecurityCount || 0}</h4><p>Segurança Strict</p></div>
            <div class="metric-card"><h4>${metrics.activeCount || 0}</h4><p>Status ativo</p></div>
        `;
    }

    renderReportSummary(report) {
        const generatedAt = report.generatedAt ? new Date(report.generatedAt).toLocaleString('pt-BR') : '-';
        const persistenceMessage = report.persistenceAvailable === false && report.message
            ? `<p class="client-security-result is-error">${report.message}</p>`
            : '';

        this.reportsContainer.innerHTML = `
            <p><strong>Última geração do relatório:</strong> ${generatedAt}</p>
            <p><strong>Integrações monitoradas:</strong> ${report.integrations?.length || 0}</p>
            <p><strong>Fluxo Evolution habilitado:</strong> CRUD de instâncias, QRCode e proxy avançado.</p>
            ${persistenceMessage}
        `;
    }

    renderIntegrations(integrations = []) {
        if (!integrations.length) {
            this.integrationsContainer.innerHTML = '<p>Nenhuma integração cadastrada até o momento.</p>';
            this.integrationSelect.innerHTML = '<option value="">Sem integrações</option>';
            this.integrationEditor.innerHTML = '<option value="">Nova integração</option>';
            this.resetIntegrationForm();
            return;
        }

        this.integrationSelect.innerHTML = integrations.map((integration, index) => (`
            <option value="${integration.id}" ${index === 0 ? 'selected' : ''}>
                ${integration.companyName} (${integration.companyId})
            </option>
        `)).join('');

        this.integrationEditor.innerHTML = `
            <option value="">Nova integração</option>
            ${integrations.map((integration) => `
                <option value="${integration.id}">${integration.companyName} (${integration.companyId})</option>
            `).join('')}
        `;

        this.integrationsContainer.innerHTML = integrations.map((integration) => {
            const lastUsage = integration.usage?.lastEventAt
                ? new Date(integration.usage.lastEventAt).toLocaleString('pt-BR')
                : 'Sem uso registrado';

            return `
                <article class="admin-client-item">
                    <h4>${integration.companyName}</h4>
                    <p><strong>ID:</strong> ${integration.companyId}</p>
                    <p><strong>Contato:</strong> ${integration.contactEmail}</p>
                    <p><strong>Segurança:</strong> ${integration.securityLevel}</p>
                    <p><strong>Status:</strong> ${integration.status || 'pending'}</p>
                    <p><strong>Eventos:</strong> ${integration.usage?.eventCount || 0}</p>
                    <p><strong>Último uso:</strong> ${lastUsage}</p>
                </article>
            `;
        }).join('');
    }

    renderJsonOutput(element, value) {
        if (!element) return;
        element.textContent = JSON.stringify(value || {}, null, 2);
    }

    renderQrCode(qrCodeData) {
        this.qrcodePreview.innerHTML = '';
        const possibleBase64 = qrCodeData?.base64 || qrCodeData?.qrcode?.base64 || qrCodeData?.code;

        if (!possibleBase64) {
            this.qrcodePreview.innerHTML = '<p>QR Code indisponível na resposta.</p>';
            return;
        }

        const src = possibleBase64.startsWith('data:image') ? possibleBase64 : `data:image/png;base64,${possibleBase64}`;
        this.qrcodePreview.innerHTML = `<img src="${src}" alt="QR Code da instância" class="qrcode-image" />`;
    }
}

class IntegrationsPortalController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.clientToken = localStorage.getItem('clientPortalToken') || '';
        this.integrations = [];
    }

    init() {
        this.view.bindLogin((event) => this.handleLogin(event));
        this.view.bindIntegrationSubmit((event) => this.handleIntegrationCreate(event));
        this.view.bindIntegrationUpdate(() => this.handleIntegrationUpdate());
        this.view.bindIntegrationDelete(() => this.handleIntegrationDelete());
        this.view.bindIntegrationEditorChange(() => this.handleEditorChange());
        this.view.bindCredentialSubmit((event) => this.handleCredentialSubmit(event));
        this.view.bindAdvancedSubmit((event) => this.handleAdvancedSubmit(event));
        this.view.bindInstanceActions({
            onCreate: () => this.handleInstanceCreate(),
            onUpdate: () => this.handleInstanceUpdate(),
            onDelete: () => this.handleInstanceDelete(),
            onQrCode: () => this.handleInstanceQrCode(),
            onList: () => this.handleInstanceList()
        });
        this.view.bindRefresh(() => this.loadDashboard());
        this.view.bindLogout(() => this.handleLogout());

        this.view.resetIntegrationForm();

        if (this.clientToken) {
            this.restoreSession();
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        const credentials = this.view.getLoginCredentials();

        if (!credentials.username || !credentials.password) {
            this.view.setStatus(this.view.loginStatus, 'Informe usuário e senha para continuar.', 'error');
            return;
        }

        try {
            const response = await this.model.login(credentials);
            const data = await response.json();

            if (!response.ok || !data.success || !data.token) {
                this.view.setStatus(this.view.loginStatus, data.message || 'Falha ao autenticar.', 'error');
                return;
            }

            this.clientToken = data.token;
            localStorage.setItem('clientPortalToken', this.clientToken);
            this.view.setLocked(false);
            this.view.setStatus(this.view.loginStatus, 'Acesso liberado com sucesso.', 'success');
            this.view.loginForm.reset();
            await this.loadDashboard();
        } catch (error) {
            console.error(error);
            this.view.setStatus(this.view.loginStatus, 'Erro de conexão ao autenticar.', 'error');
        }
    }

    async restoreSession() {
        try {
            const response = await this.model.getSession(this.clientToken);
            if (!response.ok) {
                this.clearSession();
                return;
            }

            this.view.setLocked(false);
            this.view.setStatus(this.view.loginStatus, 'Sessão restaurada com sucesso.', 'success');
            await this.loadDashboard();
        } catch (_error) {
            this.clearSession();
        }
    }

    handleEditorChange() {
        const id = this.view.getEditingIntegrationId();
        if (!id) {
            this.view.resetIntegrationForm();
            return;
        }

        const integration = this.integrations.find((item) => item.id === id);
        if (integration) {
            this.view.fillIntegrationForm(integration);
        }
    }

    async handleIntegrationCreate(event) {
        event.preventDefault();
        const payload = this.view.getIntegrationPayload();
        const validationError = this.validatePayload(payload);
        if (validationError) {
            this.view.setStatus(this.view.integrationStatus, validationError, 'error');
            return;
        }

        try {
            const response = await this.model.createIntegration(this.clientToken, payload);
            const result = await response.json();

            if (!response.ok || !result.success) {
                this.view.setStatus(this.view.integrationStatus, result.message || 'Não foi possível salvar a integração.', 'error');
                if (response.status === 401) this.clearSession();
                return;
            }

            this.view.setStatus(this.view.integrationStatus, `Integração salva com sucesso. ID gerado: ${result.integration.companyId}`, 'success');
            this.view.resetIntegrationForm();
            await this.loadDashboard();
        } catch (error) {
            console.error(error);
            this.view.setStatus(this.view.integrationStatus, 'Erro de conexão ao salvar integração.', 'error');
        }
    }

    async handleIntegrationUpdate() {
        const integrationId = this.view.getEditingIntegrationId();
        if (!integrationId) {
            this.view.setStatus(this.view.integrationStatus, 'Selecione uma integração para editar.', 'error');
            return;
        }

        const payload = this.view.getIntegrationPayload();
        const validationError = this.validatePayload(payload);
        if (validationError) {
            this.view.setStatus(this.view.integrationStatus, validationError, 'error');
            return;
        }

        try {
            const response = await this.model.updateIntegration(this.clientToken, integrationId, payload);
            const result = await response.json();
            if (!response.ok || !result.success) {
                this.view.setStatus(this.view.integrationStatus, result.message || 'Não foi possível editar a integração.', 'error');
                return;
            }

            this.view.setStatus(this.view.integrationStatus, 'Integração editada com sucesso.', 'success');
            await this.loadDashboard();
            this.view.integrationEditor.value = integrationId;
            this.handleEditorChange();
        } catch (error) {
            console.error(error);
            this.view.setStatus(this.view.integrationStatus, 'Erro de conexão ao editar integração.', 'error');
        }
    }

    async handleIntegrationDelete() {
        const integrationId = this.view.getEditingIntegrationId();
        if (!integrationId) {
            this.view.setStatus(this.view.integrationStatus, 'Selecione uma integração para deletar.', 'error');
            return;
        }

        if (!window.confirm('Deseja realmente deletar esta integração?')) {
            return;
        }

        try {
            const response = await this.model.deleteIntegration(this.clientToken, integrationId);
            const result = await response.json();
            if (!response.ok || !result.success) {
                this.view.setStatus(this.view.integrationStatus, result.message || 'Não foi possível deletar a integração.', 'error');
                return;
            }

            this.view.setStatus(this.view.integrationStatus, 'Integração deletada com sucesso.', 'success');
            this.view.resetIntegrationForm();
            await this.loadDashboard();
        } catch (error) {
            console.error(error);
            this.view.setStatus(this.view.integrationStatus, 'Erro de conexão ao deletar integração.', 'error');
        }
    }

    async handleCredentialSubmit(event) {
        event.preventDefault();
        const payload = this.view.getCredentialsPayload();

        if (!payload.integrationId || !payload.apiKey) {
            this.view.setStatus(this.view.credentialsStatus, 'Selecione a integração e informe a API Key.', 'error');
            return;
        }

        try {
            const response = await this.model.saveEvolutionCredentials(this.clientToken, payload.integrationId, payload.apiKey);
            const result = await response.json();
            if (!response.ok || !result.success) {
                this.view.setStatus(this.view.credentialsStatus, result.message || 'Falha ao salvar credencial.', 'error');
                return;
            }

            this.view.setStatus(this.view.credentialsStatus, 'Credencial salva com sucesso.', 'success');
            this.view.credentialsForm.reset();
            await this.loadDashboard();
        } catch (error) {
            console.error(error);
            this.view.setStatus(this.view.credentialsStatus, 'Erro ao salvar credencial da Evolution.', 'error');
        }
    }

    async handleInstanceCreate() {
        const integrationId = this.view.getSelectedIntegrationId();
        const payload = this.view.getInstancePayload();

        if (!integrationId || !payload.instanceName) {
            this.view.setStatus(this.view.instanceStatus, 'Selecione uma integração e informe o nome da instância.', 'error');
            return;
        }

        await this.executeInstanceRequest(
            () => this.model.createEvolutionInstance(this.clientToken, integrationId, payload),
            'Instância criada com sucesso.'
        );
    }

    async handleInstanceUpdate() {
        const integrationId = this.view.getSelectedIntegrationId();
        const payload = this.view.getInstancePayload();

        if (!integrationId || !payload.instanceName) {
            this.view.setStatus(this.view.instanceStatus, 'Selecione uma integração e informe o nome da instância.', 'error');
            return;
        }

        await this.executeInstanceRequest(
            () => this.model.updateEvolutionInstance(this.clientToken, integrationId, payload.instanceName, payload),
            'Instância atualizada com sucesso.'
        );
    }

    async handleInstanceDelete() {
        const integrationId = this.view.getSelectedIntegrationId();
        const payload = this.view.getInstancePayload();

        if (!integrationId || !payload.instanceName) {
            this.view.setStatus(this.view.instanceStatus, 'Selecione uma integração e informe o nome da instância.', 'error');
            return;
        }

        await this.executeInstanceRequest(
            () => this.model.deleteEvolutionInstance(this.clientToken, integrationId, payload.instanceName),
            'Instância removida com sucesso.'
        );
    }

    async handleInstanceList() {
        const integrationId = this.view.getSelectedIntegrationId();
        if (!integrationId) {
            this.view.setStatus(this.view.instanceStatus, 'Selecione uma integração.', 'error');
            return;
        }

        await this.executeInstanceRequest(
            () => this.model.listEvolutionInstances(this.clientToken, integrationId),
            'Instâncias listadas com sucesso.'
        );
    }

    async handleInstanceQrCode() {
        const integrationId = this.view.getSelectedIntegrationId();
        const payload = this.view.getInstancePayload();

        if (!integrationId || !payload.instanceName) {
            this.view.setStatus(this.view.instanceStatus, 'Selecione uma integração e informe o nome da instância.', 'error');
            return;
        }

        try {
            const response = await this.model.getEvolutionQrCode(this.clientToken, integrationId, payload.instanceName);
            const result = await response.json();
            if (!response.ok || !result.success) {
                this.view.setStatus(this.view.instanceStatus, result.message || 'Falha ao gerar QR Code.', 'error');
                this.view.renderJsonOutput(this.view.instanceOutput, result);
                return;
            }

            this.view.setStatus(this.view.instanceStatus, 'QR Code gerado com sucesso.', 'success');
            this.view.renderJsonOutput(this.view.instanceOutput, result);
            this.view.renderQrCode(result.data);
        } catch (error) {
            console.error(error);
            this.view.setStatus(this.view.instanceStatus, 'Erro ao obter QR Code da instância.', 'error');
        }
    }

    async executeInstanceRequest(requestFn, successMessage) {
        try {
            const response = await requestFn();
            const result = await response.json();
            if (!response.ok || !result.success) {
                this.view.setStatus(this.view.instanceStatus, result.message || 'Operação na instância falhou.', 'error');
                this.view.renderJsonOutput(this.view.instanceOutput, result);
                return;
            }

            this.view.setStatus(this.view.instanceStatus, successMessage, 'success');
            this.view.renderJsonOutput(this.view.instanceOutput, result);
        } catch (error) {
            console.error(error);
            this.view.setStatus(this.view.instanceStatus, 'Erro de conexão com Evolution API.', 'error');
        }
    }

    async handleAdvancedSubmit(event) {
        event.preventDefault();
        const integrationId = this.view.getSelectedIntegrationId();
        const advanced = this.view.getAdvancedPayload();

        if (!integrationId || !advanced.path) {
            this.view.renderJsonOutput(this.view.advancedOutput, { error: 'Selecione integração e path válido.' });
            return;
        }

        let payload;
        if (advanced.payloadRaw) {
            try {
                payload = JSON.parse(advanced.payloadRaw);
            } catch (_error) {
                this.view.renderJsonOutput(this.view.advancedOutput, { error: 'Payload JSON inválido.' });
                return;
            }
        }

        try {
            const response = await this.model.proxyEvolutionConfig(this.clientToken, integrationId, {
                method: advanced.method,
                path: advanced.path,
                payload
            });
            const result = await response.json();
            this.view.renderJsonOutput(this.view.advancedOutput, result);
        } catch (error) {
            console.error(error);
            this.view.renderJsonOutput(this.view.advancedOutput, { error: 'Erro ao executar configuração avançada.' });
        }
    }

    async loadDashboard() {
        this.view.integrationsContainer.innerHTML = '<p>Atualizando dashboard...</p>';

        try {
            const response = await this.model.getIntegrationsReport(this.clientToken);
            const report = await response.json();

            if (!response.ok || !report.success) {
                this.view.integrationsContainer.innerHTML = `<p>${report.message || 'Não foi possível carregar relatórios.'}</p>`;
                if (response.status === 401) this.clearSession();
                return;
            }

            this.integrations = report.integrations || [];
            this.view.renderMetrics(report.metrics);
            this.view.renderReportSummary(report);
            this.view.renderIntegrations(this.integrations);
        } catch (error) {
            console.error(error);
            this.view.integrationsContainer.innerHTML = '<p>Erro de conexão ao carregar dashboard.</p>';
        }
    }

    async handleLogout() {
        try {
            if (this.clientToken) {
                await this.model.logout(this.clientToken);
            }
        } catch (_error) {
            // noop
        }

        this.clearSession();
        this.view.setStatus(this.view.loginStatus, 'Sessão encerrada.', 'success');
    }

    clearSession() {
        this.clientToken = '';
        this.integrations = [];
        localStorage.removeItem('clientPortalToken');
        this.view.setLocked(true);
        this.view.resetIntegrationForm();
        this.view.integrationsContainer.innerHTML = '<p>Conecte-se para visualizar relatórios de integrações.</p>';
    }

    validatePayload(payload) {
        const emailRegex = /^\S+@\S+\.\S+$/;
        const validSecurityLevels = new Set(['strict', 'high', 'standard']);

        if (!payload.companyName || payload.companyName.length < 3) {
            return 'Informe um nome da empresa válido.';
        }

        if (!emailRegex.test(payload.contactEmail)) {
            return 'Informe um e-mail corporativo válido.';
        }

        if (!this.isHttpsUrl(payload.n8nEndpoint) || !this.isHttpsUrl(payload.evolutionEndpoint)) {
            return 'Informe endpoints HTTPS válidos para n8n e Evolution API.';
        }

        if (!validSecurityLevels.has(payload.securityLevel)) {
            return 'Selecione um nível de segurança válido.';
        }

        return '';
    }

    isHttpsUrl(value) {
        try {
            const parsed = new URL(value);
            return parsed.protocol === 'https:';
        } catch (_error) {
            return false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const model = new IntegrationsApiModel();
    const view = new IntegrationsPortalView();
    const controller = new IntegrationsPortalController(model, view);
    controller.init();
});
