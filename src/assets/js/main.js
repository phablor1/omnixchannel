class ConectXIPApp {
    constructor() {
        this.initSmoothScroll();
        this.initHeaderScrollEffect();
        this.initObserver();
        this.initContactForm();
        this.initClientSecurityForm();
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
        const observer = new IntersectionObserver((entries) => {
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

        const statsSection = document.querySelector('.stats');
        if (statsSection) observer.observe(statsSection);
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
        if (form) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                alert('Obrigado! Sua mensagem foi enviada. Entraremos em contato em breve.');
            });
        }
    }

    initClientSecurityForm() {
        const form = document.getElementById('client-integration-form');
        const resultBox = document.getElementById('client-security-result');
        if (!form || !resultBox) return;

        form.addEventListener('submit', e => {
            e.preventDefault();

            const companyId = (document.getElementById('company-id').value || '').trim();
            const email = (document.getElementById('contact-email').value || '').trim();
            const n8nEndpoint = (document.getElementById('n8n-endpoint').value || '').trim();
            const evolutionEndpoint = (document.getElementById('evolution-endpoint').value || '').trim();
            const securityLevel = document.getElementById('security-level').value;

            const validationError = this.validateSecurityPayload({
                companyId,
                email,
                n8nEndpoint,
                evolutionEndpoint,
                securityLevel
            });

            if (validationError) {
                resultBox.className = 'client-security-result error';
                resultBox.textContent = validationError;
                return;
            }

            resultBox.className = 'client-security-result success';
            resultBox.textContent = '✅ Requisitos mínimos validados. Próximo passo: provisionamento server-side com segredo em Vault, rotação de token e IP allowlist.';
            form.reset();
        });
    }

    validateSecurityPayload(payload) {
        const companyIdPattern = /^[A-Za-z0-9_-]{4,40}$/;
        if (!companyIdPattern.test(payload.companyId)) {
            return 'ID da empresa inválido. Use apenas letras, números, _ e - com 4 a 40 caracteres.';
        }

        const isCorporateEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) && !/@(gmail|hotmail|yahoo|outlook)\./i.test(payload.email);
        if (!isCorporateEmail) {
            return 'Use um e-mail corporativo válido para iniciar a integração.';
        }

        if (!this.isValidHttpsUrl(payload.n8nEndpoint) || !this.isValidHttpsUrl(payload.evolutionEndpoint)) {
            return 'Os endpoints de integração devem usar HTTPS válido.';
        }

        if (!payload.securityLevel) {
            return 'Selecione um nível de segurança para prosseguir.';
        }

        return '';
    }

    isValidHttpsUrl(urlString) {
        try {
            const parsed = new URL(urlString);
            return parsed.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }
}

// ROI Calculator (independente)
function calculateROI() {
    const employees = parseInt(document.getElementById('employees').value) || 0;
    const salary = parseFloat(document.getElementById('salary').value) || 0;
    const tickets = parseInt(document.getElementById('tickets').value) || 0;

    if (employees === 0 || salary === 0 || tickets === 0) {
        alert('Por favor, preencha todos os campos para calcular o ROI');
        return;
    }

    const monthlyCost = employees * salary;
    const automationSavings = monthlyCost * 0.7;
    const annualSavings = automationSavings * 12;
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

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
    new ConectXIPApp();
});
