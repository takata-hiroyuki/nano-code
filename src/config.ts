export let config = {
    // Layer2: プロセス隔離(bubble wrap)
    sandbox: false,
    // Layer3: アプリケーション層の設定
    allowedDomains: ['api.github.com', 'github.com'],
}