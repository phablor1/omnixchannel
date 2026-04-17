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

    async saveIntegration(token, payload) {
        return this.authenticatedFetch('/api/client-integrations', token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    async getIntegrationsReport(token) {
        return this.authenticatedFetch('/api/client-integrations/reports', token);
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
        this.metricsContainer = document.getElementById('portal-metrics');
        this.reportsContainer = document.getElementById('portal-reports');
        this.integrationsContainer = document.getElementById('admin-clients-list');
    }

    bindLogin(handler) {
        this.loginForm?.addEventListener('submit', handler);
    }

    bindIntegrationSubmit(handler) {
        this.integrationForm?.addEventListener('submit', handler);
    }

    bindRefresh(handler) {
        this.refreshButton?.addEventListener('click', handler);
    }

    bindLogout(handler) {
        this.logoutButton?.addEventListener('click', handler);
    }

    setLocked(isLocked) {
        this.loginWrapper?.classList.toggle('is-hidden', !isLocked);
        this.clientAreaContent?.classList.toggle('is-locked', isLocked);
    }

    setStatus(element, message, type) {
        if (!element) {
            return;
        }

        element.textContent = message;
        element.classList.remove('is-error', 'is-success');
        if (type === 'error') {
            element.classList.add('is-error');
        }
        if (type === 'success') {
            element.classList.add('is-success');
        }
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
            companyId: (formData.get('companyId') || '').toString().trim(),
            contactEmail: (formData.get('contactEmail') || '').toString().trim(),
            n8nEndpoint: (formData.get('n8nEndpoint') || '').toString().trim(),
            evolutionEndpoint: (formData.get('evolutionEndpoint') || '').toString().trim(),
            securityLevel: (formData.get('securityLevel') || '').toString().trim()
        };
    }

    renderMetrics(metrics = {}) {
        const totalIntegrations = metrics.totalIntegrations || 0;
        const totalEvents = metrics.totalEvents || 0;
        const strictSecurityCount = metrics.strictSecurityCount || 0;
        const activeCount = metrics.activeCount || 0;

        this.metricsContainer.innerHTML = `
            <div class="metric-card"><h4>${totalIntegrations}</h4><p>Integrações</p></div>
            <div class="metric-card"><h4>${totalEvents}</h4><p>Eventos de uso</p></div>
            <div class="metric-card"><h4>${strictSecurityCount}</h4><p>Segurança Strict</p></div>
            <div class="metric-card"><h4>${activeCount}</h4><p>Status ativo</p></div>
        `;
    }

    renderReportSummary(report) {
        const generatedAt = report.generatedAt
            ? new Date(report.generatedAt).toLocaleString('pt-BR')
            : '-';

        this.reportsContainer.innerHTML = `
            <p><strong>Última geração do relatório:</strong> ${generatedAt}</p>
            <p><strong>Integrações monitoradas:</strong> ${report.integrations?.length || 0}</p>
        `;
    }

    renderIntegrations(integrations = []) {
        if (!integrations.length) {
            this.integrationsContainer.innerHTML = '<p>Nenhuma integração cadastrada até o momento.</p>';
            return;
        }

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
}

class IntegrationsPortalController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.clientToken = localStorage.getItem('clientPortalToken') || '';
    }

    init() {
        this.view.bindLogin((event) => this.handleLogin(event));
        this.view.bindIntegrationSubmit((event) => this.handleIntegrationSubmit(event));
        this.view.bindRefresh(() => this.loadDashboard());
        this.view.bindLogout(() => this.handleLogout());

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

    async handleIntegrationSubmit(event) {
        event.preventDefault();

        const payload = this.view.getIntegrationPayload();
        const validationError = this.validatePayload(payload);
        if (validationError) {
            this.view.setStatus(this.view.integrationStatus, validationError, 'error');
            return;
        }

        try {
            const response = await this.model.saveIntegration(this.clientToken, payload);
            const result = await response.json();

            if (!response.ok || !result.success) {
                this.view.setStatus(this.view.integrationStatus, result.message || 'Não foi possível salvar a integração.', 'error');
                if (response.status === 401) {
                    this.clearSession();
                }
                return;
            }

            this.view.setStatus(this.view.integrationStatus, 'Integração salva com sucesso.', 'success');
            this.view.integrationForm.reset();
            await this.loadDashboard();
        } catch (error) {
            console.error(error);
            this.view.setStatus(this.view.integrationStatus, 'Erro de conexão ao salvar integração.', 'error');
        }
    }

    async loadDashboard() {
        this.view.integrationsContainer.innerHTML = '<p>Atualizando dashboard...</p>';

        try {
            const response = await this.model.getIntegrationsReport(this.clientToken);
            const report = await response.json();

            if (!response.ok || !report.success) {
                this.view.integrationsContainer.innerHTML = `<p>${report.message || 'Não foi possível carregar relatórios.'}</p>`;
                if (response.status === 401) {
                    this.clearSession();
                }
                return;
            }

            this.view.renderMetrics(report.metrics);
            this.view.renderReportSummary(report);
            this.view.renderIntegrations(report.integrations || []);
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
        localStorage.removeItem('clientPortalToken');
        this.view.setLocked(true);
        this.view.integrationsContainer.innerHTML = '<p>Conecte-se para visualizar relatórios de integrações.</p>';
    }

    validatePayload(payload) {
        const companyIdRegex = /^[A-Za-z0-9_-]{4,40}$/;
        const emailRegex = /^\S+@\S+\.\S+$/;
        const validSecurityLevels = new Set(['strict', 'high', 'standard']);

        if (!payload.companyName || !companyIdRegex.test(payload.companyId)) {
            return 'Nome da empresa e ID devem ser válidos.';
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
