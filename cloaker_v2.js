/**
 * Manus Advanced Cloaker v2.0 - Anti-Ads Review Edition
 * Focado em passar nas análises do TikTok Ads e Meta Ads.
 */

(function() {
    // CONFIGURAÇÕES AVANÇADAS
    const config = {
        onlyMobile: true,          // Bloqueia TUDO que não for mobile real
        minBatteryLevel: 0.1,      // Bots muitas vezes não reportam bateria ou reportam 100% fixo
        checkTouchPoints: true,    // Dispositivos móveis reais têm pontos de toque
        debug: false               // Mantenha false em produção
    };

    // Sinais de bots de análise e revisores humanos em desktop
    const blacklistUA = [
        'bot', 'spider', 'crawl', 'lighthouse', 'headless', 'chrome-lighthouse',
        'facebookexternalhit', 'facebookcatalog', 'meta-inspector', 'tiktokbot',
        'adsbot', 'googlebot', 'mediapartners-google', 'linux', 'windows nt 10.0',
        'macintosh', 'x11', 'ubuntu', 'debian'
    ];

    async function isSafeUser() {
        const ua = navigator.userAgent.toLowerCase();
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;

        // 1. Verificação de User-Agent (Blacklist agressiva)
        if (blacklistUA.some(keyword => ua.includes(keyword))) {
            if (config.debug) console.log("Cloaker: Bot detectado via User-Agent");
            return false;
        }

        // 2. Verificação de Dispositivo Móvel Real
        const isMobileUA = /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua);
        if (!isMobileUA && config.onlyMobile) {
            if (config.debug) console.log("Cloaker: Não é dispositivo móvel e onlyMobile é true");
            return false;
        }

        // 3. Verificação de Pontos de Toque (Essencial para Mobile)
        if (config.checkTouchPoints && navigator.maxTouchPoints < 1) {
            if (config.debug) console.log("Cloaker: Dispositivo sem pontos de toque");
            return false;
        }

        // 4. Verificação de Resolução de Ecrã (Bots de análise usam resoluções padrão de desktop)
        // Ajuste estes valores se o seu site mobile tiver layouts muito grandes
        if (screenWidth > 1000 || screenHeight > 1200) {
            if (config.debug) console.log("Cloaker: Resolução de ecrã grande demais para mobile");
            return false;
        }

        // 5. Detecção de Automação (WebDriver)
        if (navigator.webdriver) {
            if (config.debug) console.log("Cloaker: WebDriver detectado");
            return false;
        }

        // 6. Verificação de Bateria (Opcional, mas eficaz)
        // Bots muitas vezes não implementam a API de bateria corretamente
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                // Se a bateria estiver a carregar e no nível máximo (100%), pode ser um sinal de VM/bot
                if (battery.charging && battery.level === 1 && config.debug) {
                    console.log("Cloaker: Bateria 100% e a carregar - possível bot");
                    // return false; // Descomente para ativar esta regra
                }
                // Se o nível da bateria for muito baixo (ex: 0) e não estiver a carregar, pode ser um sinal de VM/bot
                if (battery.level < config.minBatteryLevel && !battery.charging && config.debug) {
                    console.log("Cloaker: Nível de bateria muito baixo e não a carregar - possível bot");
                    // return false; // Descomente para ativar esta regra
                }
            } catch (e) {
                if (config.debug) console.log("Cloaker: Erro ao aceder API de bateria", e);
                // Se houver erro ao aceder a API, pode ser um ambiente restrito (bot)
                // return false; // Descomente para ativar esta regra
            }
        }

        if (config.debug) console.log("Cloaker: Utilizador considerado seguro");
        return true;
    }

    async function applyCloaking() {
        // Ocultar tudo inicialmente para evitar "leak" de conteúdo
        const style = document.createElement('style');
        style.innerHTML = 'html { display: none !important; }';
        document.head.appendChild(style);

        const safe = await isSafeUser();
        
        window.addEventListener('DOMContentLoaded', () => {
            const realContent = document.getElementById('real-content');
            const fakeContent = document.getElementById('fake-content');

            if (safe) {
                if (realContent) realContent.style.display = 'block';
                if (fakeContent) fakeContent.remove(); // Remove o lixo do DOM
                if (config.debug) console.log("Cloaker: Acesso Real Permitido");
            } else {
                if (fakeContent) fakeContent.style.display = 'block';
                if (realContent) realContent.remove(); // Remove o conteúdo sensível do DOM
                if (config.debug) console.log("Cloaker: Exibindo Site Cobaia");
            }

            // Revelar a página após a troca
            style.remove();
        });
    }

    applyCloaking();
})();
