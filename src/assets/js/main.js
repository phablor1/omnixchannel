class ConectXIPApp {
    constructor() {
        this.apiBaseUrl = window.location.origin.includes('localhost:8080')
            ? 'http://localhost:3000'
            : window.location.origin;
        this.clientToken = localStorage.getItem('clientPortalToken') || '';

        this.initSmoothScroll();
        this.initHeaderScrollEffect();
        this.initObserver();
        this.initContactForm();
        this.initClientArea();
    }

    initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', e => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    initHeaderScrollEffect() {
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (!header) {
                return;
            }

            if (window.scrollY > 100) {
                header.style.background = 'rgba(255, 255, 255, 0.98)';
                header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            } else {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.boxShadow = 'none';
            }
        });
    }

    initObserver() {
        const statsSection = document.querySelector('.stats');
        if (!statsSection) {
            return;
        }

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counters = entry.target.querySelectorAll('.stat-item h3');
                    counters.forEach(counter => {
                        const target = counter.textContent.replace(/[^0-9.]/g, '');
                        this.animateCounter(counter, parseFloat(target));
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.7 });

        observer.observe(statsSection);
    }

    animateCounter(element, target) {
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target + (target === 10 ? '+' : '');
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current) + (target === 10 ? '+' : '');
            }
        }, 40);
    }

    initContactForm() {
        const form = document.querySelector('.contact-form form');
        if (!form) {
            return;
        }

        form.addEventListener('submit', async e => {
            e.preventDefault();

            const formData = new FormData(form);
            const data = {
                nome: formData.get('nome'),
                email: formData.get('email'),
                empresa: formData.get('empresa'),
                mensagem: formData.get('mensagem')
            };

            try {
                const res = await fetch(`${this.apiBaseUrl}/api/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await res.json();

                if (result.success) {
                    alert('✅ Mensagem enviada com sucesso! Em breve entraremos em contato.');
                    form.reset();
                } else {
                    alert(`❌ ${result.message}`);
                }
            } catch (error) {
                console.error(error);
                alert('❌ Erro de conexão com o servidor. Tente novamente mais tarde.');
            }
        });
    }

    initClientArea() {
        this.loginWrapper = document.getElementById('client-login-wrapper');
        this.loginForm = document.getElementById('client-login-form');
        this.loginStatus = document.getElementById('client-login-status');
        this.clientAreaContent = document.getElementById('client-area-content');
        this.clientIntegrationForm = document.getElementById('client-integration-form');
        this.clientSecurityResult = document.getElementById('client-security-result');
        this.clientsList = document.getElementById('admin-clients-list');
        this.refreshButton = document.getElementById('refresh-admin-clients');
        this.logoutButton = document.getElementById('client-logout');

        if (!this.loginForm || !this.clientAreaContent) {
            return;
        }

        this.setClientAreaLocked(true);
        this.loginForm.addEventListener('submit', event => this.handleClientLogin(event));

        if (this.clientIntegrationForm) {
            this.clientIntegrationForm.addEventListener('submit', event => this.handleIntegrationSubmit(event));
        }

        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => this.loadClientIntegrations());
        }

        if (this.logoutButton) {
            this.logoutButton.addEventListener('click', () => this.handleClientLogout());
        }

        if (this.clientToken) {
            this.restoreClientSession();
        }
    }

    async handleClientLogin(event) {
        event.preventDefault();

        const usernameInput = document.getElementById('client-username');
        const passwordInput = document.getElementById('client-password');

        const username = (usernameInput?.value || '').trim();
        const password = passwordInput?.value || '';

        if (!username || !password) {
            this.setStatus(this.loginStatus, 'Informe usuário e senha para continuar.', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/client-auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (!response.ok || !data.success || !data.token) {
                this.setStatus(this.loginStatus, data.message || 'Falha ao autenticar.', 'error');
                return;
            }

            this.clientToken = data.token;
            localStorage.setItem('clientPortalToken', this.clientToken);
            this.setClientAreaLocked(false);
            this.setStatus(this.loginStatus, 'Acesso liberado com sucesso.', 'success');
            this.loginForm.reset();
            this.loadClientIntegrations();
        } catch (error) {
            console.error(error);
            this.setStatus(this.loginStatus, 'Erro de conexão ao autenticar.', 'error');
        }
    }

    async restoreClientSession() {
        try {
            const response = await this.authenticatedFetch('/api/client-auth/session');
            if (!response.ok) {
                this.clearSession();
                return;
            }

            this.setClientAreaLocked(false);
            this.setStatus(this.loginStatus, 'Sessão restaurada com sucesso.', 'success');
            this.loadClientIntegrations();
        } catch (error) {
            console.error(error);
            this.clearSession();
        }
    }

    async handleClientLogout() {
        try {
            if (this.clientToken) {
                await this.authenticatedFetch('/api/client-auth/logout', { method: 'POST' });
            }
        } catch (error) {
            console.error(error);
        }

        this.clearSession();
        this.setStatus(this.loginStatus, 'Sessão encerrada.', 'success');
    }

    clearSession() {
        this.clientToken = '';
        localStorage.removeItem('clientPortalToken');
        this.setClientAreaLocked(true);
        if (this.clientsList) {
            this.clientsList.innerHTML = '<p>Conecte-se para visualizar as integrações de clientes.</p>';
        }
    }

    setClientAreaLocked(isLocked) {
        if (!this.loginWrapper || !this.clientAreaContent) {
            return;
        }

        this.loginWrapper.classList.toggle('is-hidden', !isLocked);
        this.clientAreaContent.classList.toggle('is-locked', isLocked);
        this.clientAreaContent.hidden = isLocked;
        this.clientAreaContent.setAttribute('aria-hidden', isLocked ? 'true' : 'false');
        this.toggleProtectedFields(isLocked);
    }

    toggleProtectedFields(isLocked) {
        const protectedFields = this.clientAreaContent.querySelectorAll('input, select, textarea, button');
        protectedFields.forEach(field => {
            field.disabled = isLocked;
            if (isLocked) {
                field.tabIndex = -1;
            } else {
                field.removeAttribute('tabindex');
            }
        });
    }

    async handleIntegrationSubmit(event) {
        event.preventDefault();

        if (!this.clientToken) {
            this.setStatus(this.clientSecurityResult, 'Sessão expirada. Faça login novamente.', 'error');
            this.clearSession();
            return;
        }

        const payload = this.getIntegrationPayload();
        const validationError = this.validateIntegrationPayload(payload);

        if (validationError) {
            this.setStatus(this.clientSecurityResult, validationError, 'error');
            return;
        }

        try {
            const response = await this.authenticatedFetch('/api/client-integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                this.setStatus(this.clientSecurityResult, result.message || 'Não foi possível salvar a integração.', 'error');
                if (response.status === 401) {
                    this.clearSession();
                }
                return;
            }

            this.setStatus(this.clientSecurityResult, 'Integração salva com sucesso.', 'success');
            this.clientIntegrationForm.reset();
            this.loadClientIntegrations();
        } catch (error) {
            console.error(error);
            this.setStatus(this.clientSecurityResult, 'Erro de conexão ao salvar integração.', 'error');
        }
    }

    async loadClientIntegrations() {
        if (!this.clientsList) {
            return;
        }

        this.clientsList.innerHTML = '<p>Atualizando integrações...</p>';

        try {
            const response = await this.authenticatedFetch('/api/client-integrations');
            const result = await response.json();

            if (!response.ok || !result.success) {
                this.clientsList.innerHTML = `<p>${result.message || 'Não foi possível carregar as integrações.'}</p>`;
                if (response.status === 401) {
                    this.clearSession();
                }
                return;
            }

            if (!Array.isArray(result.integrations) || result.integrations.length === 0) {
                this.clientsList.innerHTML = '<p>Nenhuma integração cadastrada até o momento.</p>';
                return;
            }

            this.clientsList.innerHTML = result.integrations.map(integration => `
                <article class="admin-client-item">
                    <h4>${integration.companyName}</h4>
                    <p><strong>ID:</strong> ${integration.companyId}</p>
                    <p><strong>Contato:</strong> ${integration.contactEmail}</p>
                    <p><strong>Nível de segurança:</strong> ${integration.securityLevel}</p>
                    <p><strong>n8n:</strong> ${integration.n8nEndpoint}</p>
                    <p><strong>Evolution:</strong> ${integration.evolutionEndpoint}</p>
                    <small>Criado em: ${new Date(integration.createdAt).toLocaleString('pt-BR')}</small>
                </article>
            `).join('');
        } catch (error) {
            console.error(error);
            this.clientsList.innerHTML = '<p>Erro de conexão ao carregar integrações.</p>';
        }
    }

    getIntegrationPayload() {
        const formData = new FormData(this.clientIntegrationForm);
        return {
            companyName: (formData.get('companyName') || '').toString().trim(),
            companyId: (formData.get('companyId') || '').toString().trim(),
            contactEmail: (formData.get('contactEmail') || '').toString().trim(),
            n8nEndpoint: (formData.get('n8nEndpoint') || '').toString().trim(),
            evolutionEndpoint: (formData.get('evolutionEndpoint') || '').toString().trim(),
            securityLevel: (formData.get('securityLevel') || '').toString().trim()
        };
    }

    validateIntegrationPayload(payload) {
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
            const url = new URL(value);
            return url.protocol === 'https:';
        } catch (_error) {
            return false;
        }
    }

    authenticatedFetch(path, options = {}) {
        const defaultHeaders = {
            Authorization: `Bearer ${this.clientToken}`,
            ...(options.headers || {})
        };

        return fetch(`${this.apiBaseUrl}${path}`, {
            ...options,
            headers: defaultHeaders
        });
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
}

function calculateROI() {
    const employees = parseInt(document.getElementById('employees').value, 10) || 0;
    const salary = parseFloat(document.getElementById('salary').value) || 0;
    const tickets = parseInt(document.getElementById('tickets').value, 10) || 0;

    if (employees === 0 || salary === 0 || tickets === 0) {
        alert('Por favor, preencha todos os campos para calcular o ROI');
        return;
    }

    const monthlyCost = employees * salary;
    const automationSavings = monthlyCost * 0.7;
    const automationCost = 2000;
    const netSavings = automationSavings - automationCost;
    const netAnnualSavings = netSavings * 12;
    const roi = ((netAnnualSavings / (automationCost * 12)) * 100).toFixed(0);

    const resultDiv = document.getElementById('roi-result');
    resultDiv.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <strong>💰 Economia Mensal: R$ ${automationSavings.toLocaleString('pt-BR')}</strong>
        </div>
        <div style="margin-bottom: 1rem;">
            <strong>📈 ROI Anual: ${roi}%</strong>
        </div>
        <div>
            <small>Economia líquida anual: R$ ${netAnnualSavings.toLocaleString('pt-BR')}</small>
        </div>
    `;
    resultDiv.classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
    new ConectXIPApp();
});
