# 🛡️ **GUIA DEFINITIVO - SEGURANÇA & BOAS PRÁTICAS DE CÓDIGO**
## **DOCUMENTO ULTRA-COMPLETO PARA ZERO ERROS NO VIBE CODE**

---

## 🎯 **OBJETIVO**
Criar o **documento mais completo** de regras de segurança e boas práticas para garantir **ZERO erros** no Codacy, **ZERO vulnerabilidades**, e **código perfeito** em qualquer projeto.

---

## 📖 **ÍNDICE**
1. [🚨 REGRAS CRÍTICAS DE SEGURANÇA](#regras-críticas-de-segurança)
2. [🗄️ DATABASE & SQL SECURITY](#database--sql-security)
3. [🔐 AUTHENTICATION & AUTHORIZATION](#authentication--authorization)
4. [📁 FILE SYSTEM SECURITY](#file-system-security)
5. [🌐 WEB & API SECURITY](#web--api-security)
6. [⚛️ REACT/NEXT.JS ESPECÍFICO](#reactnextjs-específico)
7. [🐘 POSTGRESQL/SUPABASE](#postgresqlsupabase)
8. [🧹 CÓDIGO LIMPO & ESTRUTURA](#código-limpo--estrutura)
9. [🔍 INPUT VALIDATION](#input-validation)
10. [📊 LOGGING & MONITORING](#logging--monitoring)
11. [🐳 DOCKER & DEPLOYMENT](#docker--deployment)
12. [🎯 CI/CD & AUTOMATION](#cicd--automation)
13. [📋 CHECKLISTS OBRIGATÓRIOS](#checklists-obrigatórios)

---

## 🚨 **REGRAS CRÍTICAS DE SEGURANÇA** <a name="regras-críticas-de-segurança"></a>

### **⚡ TOP 10 NUNCA VIOLAR - ZERO TOLERÂNCIA:**

#### **1. SQL Injection = MORTE INSTANTÂNEA**
```sql
-- ❌ MORTE INSTANTÂNEA: Concatenação de strings
const query = "SELECT * FROM users WHERE id = " + userId;

-- ❌ MORTE INSTANTÂNEA: Template literals vulneráveis
const query = `SELECT * FROM users WHERE name = '${userName}'`;

-- ✅ VIDA ETERNA: Queries parametrizadas SEMPRE
const query = "SELECT * FROM users WHERE id = $1 AND name = $2";
const result = await db.query(query, [userId, userName]);
```

#### **2. GRANT ALL = PROIBIDO PARA SEMPRE**
```sql
-- ❌ NUNCA JAMAIS: GRANT ALL privileges
GRANT ALL ON schema.table TO role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;

-- ✅ SEMPRE: Permissões específicas por necessidade
GRANT SELECT, INSERT ON users TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;
```

#### **3. RLS DESABILITADO = VULNERABILIDADE CRÍTICA**
```sql
-- ❌ PROIBIDO: Desabilitar RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ✅ OBRIGATÓRIO: RLS sempre ativo
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON users FOR ALL TO authenticated USING (auth.uid() = id);
```

#### **4. Passwords Plain Text = GAME OVER**
```javascript
// ❌ GAME OVER: Plain text passwords
user.password = "123456";
const hash = crypto.createHash('md5').update(password).digest('hex');

// ✅ SURVIVAL: bcrypt com salt forte
const saltRounds = 12; // Mínimo 12!
const hash = await bcrypt.hash(password, saltRounds);
const isValid = await bcrypt.compare(inputPassword, hash);
```

#### **5. eval() = CÓDIGO MALICIOSO GARANTIDO**
```javascript
// ❌ CÓDIGO MALICIOSO: eval com input usuário
const userCode = req.body.code;
eval(userCode); // RCE vulnerability!

// ✅ SEGURO: VM sandbox ou evitar completamente
const vm = require('vm');
const sandbox = { result: null, console: { log: () => {} } };
vm.runInContext(code, vm.createContext(sandbox), { timeout: 1000 });
```

---

## 🗄️ **DATABASE & SQL SECURITY** <a name="database--sql-security"></a>

### **🔒 REGRAS ABSOLUTAS POSTGRESQL/SUPABASE**

#### **✅ ESTRUTURA DE PERMISSÕES PERFEITA:**
```sql
-- ✅ 1. SEMPRE: Schema separation
CREATE SCHEMA app_data;
CREATE SCHEMA app_functions;
CREATE SCHEMA app_views;

-- ✅ 2. SEMPRE: Role hierarchy
CREATE ROLE app_user;
CREATE ROLE app_admin;
CREATE ROLE app_service;

-- ✅ 3. SEMPRE: Granular permissions
-- Users só podem ler seus próprios dados
GRANT SELECT ON app_data.user_profiles TO app_user;
GRANT INSERT, UPDATE ON app_data.user_profiles TO app_user;

-- Admins têm acesso controlado
GRANT SELECT ON ALL TABLES IN SCHEMA app_data TO app_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_functions TO app_admin;

-- Services têm permissões específicas
GRANT SELECT, INSERT ON app_data.audit_logs TO app_service;
```

#### **✅ RLS POLICIES BULLETPROOF:**
```sql
-- ✅ SEMPRE: Policies específicas por operação
CREATE POLICY "select_own_profile" ON user_profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "insert_own_profile" ON user_profiles  
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_profile" ON user_profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_read_all" ON user_profiles
FOR SELECT TO app_admin
USING (true);

-- ✅ SEMPRE: Policy para prevent data leakage
CREATE POLICY "prevent_email_enumeration" ON users
FOR SELECT TO authenticated
USING (
  CASE 
    WHEN auth.uid() = id THEN true
    ELSE email IS NULL OR email = ''
  END
);
```

#### **✅ FUNÇÕES SECURITY DEFINER PERFEITAS:**
```sql
-- ✅ TEMPLATE DEFINITIVO para funções seguras
CREATE OR REPLACE FUNCTION get_user_dashboard(target_user_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, app_data, app_functions
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb;
    current_user_id uuid;
BEGIN
    -- ✅ 1. SEMPRE validar autenticação
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Authentication required',
            'code', 'AUTH_REQUIRED'
        );
    END IF;
    
    -- ✅ 2. SEMPRE validar autorização
    IF current_user_id != target_user_id THEN
        -- Log attempted access
        INSERT INTO audit_logs (user_id, action, details) 
        VALUES (current_user_id, 'UNAUTHORIZED_ACCESS_ATTEMPT', 
                jsonb_build_object('target_user', target_user_id));
                
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Access denied',
            'code', 'ACCESS_DENIED'
        );
    END IF;
    
    -- ✅ 3. SEMPRE validar inputs
    IF target_user_id IS NULL OR target_user_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid user ID',
            'code', 'INVALID_INPUT'
        );
    END IF;
    
    -- ✅ 4. Lógica de negócio com error handling
    BEGIN
        SELECT jsonb_build_object(
            'user_id', u.id,
            'email', u.email,
            'profile', p.data,
            'last_login', u.last_login_at
        ) INTO result
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE u.id = target_user_id;
        
        -- ✅ 5. SEMPRE verificar se dados existem
        IF result IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'User not found',
                'code', 'NOT_FOUND'
            );
        END IF;
        
        RETURN jsonb_build_object('success', true, 'data', result);
        
    EXCEPTION
        WHEN OTHERS THEN
            -- ✅ 6. SEMPRE log errors sem expor detalhes
            INSERT INTO error_logs (user_id, function_name, error_message, error_detail)
            VALUES (current_user_id, 'get_user_dashboard', SQLERRM, SQLSTATE);
            
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Internal server error',
                'code', 'INTERNAL_ERROR'
            );
    END;
END;
$$;

-- ✅ SEMPRE: Revoke public access
REVOKE ALL ON FUNCTION get_user_dashboard FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_dashboard TO authenticated;
```

#### **❌ ANTI-PATTERNS MORTAIS:**
```sql
-- ❌ NUNCA: Dynamic SQL
CREATE FUNCTION bad_search(search_term text) RETURNS text AS $$
BEGIN
    EXECUTE 'SELECT * FROM users WHERE name = ''' || search_term || '''';
END;
$$ LANGUAGE plpgsql;

-- ❌ NUNCA: Functions sem SECURITY DEFINER
CREATE FUNCTION insecure_function() RETURNS text AS $$
-- Roda com privilégios do caller
$$ LANGUAGE sql;

-- ❌ NUNCA: Broad permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- ❌ NUNCA: RLS bypass sem justificação
ALTER TABLE sensitive_data DISABLE ROW LEVEL SECURITY;
```

---

## 🔐 **AUTHENTICATION & AUTHORIZATION** <a name="authentication--authorization"></a>

### **🛡️ SISTEMA DE AUTH BULLETPROOF**

#### **✅ PASSWORD SECURITY PERFEITA:**
```javascript
// ✅ CONFIGURAÇÃO DEFINITIVA bcrypt
const bcrypt = require('bcrypt');

const PASSWORD_CONFIG = {
    saltRounds: 12, // Mínimo 12, idealmente 14+ para alta segurança
    maxLength: 128,
    minLength: 12
};

// ✅ REGEX DEFINITIVO para passwords fortes
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])(?!.*\s).{12,128}$/;

// ✅ FUNÇÃO DEFINITIVA de hash
async function hashPassword(plainPassword) {
    // Validação de input
    if (!plainPassword || typeof plainPassword !== 'string') {
        throw new Error('Password must be a non-empty string');
    }
    
    if (plainPassword.length < PASSWORD_CONFIG.minLength) {
        throw new Error(`Password must be at least ${PASSWORD_CONFIG.minLength} characters`);
    }
    
    if (plainPassword.length > PASSWORD_CONFIG.maxLength) {
        throw new Error(`Password must be less than ${PASSWORD_CONFIG.maxLength} characters`);
    }
    
    if (!PASSWORD_REGEX.test(plainPassword)) {
        throw new Error('Password does not meet complexity requirements');
    }
    
    // Hash seguro
    return await bcrypt.hash(plainPassword, PASSWORD_CONFIG.saltRounds);
}

// ✅ FUNÇÃO DEFINITIVA de verificação
async function verifyPassword(plainPassword, hashedPassword) {
    if (!plainPassword || !hashedPassword) {
        return false;
    }
    
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        // Log security event
        logger.security('Password verification failed', { error: error.message });
        return false;
    }
}
```

#### **✅ JWT SECURITY DEFINITIVA:**
```javascript
// ✅ JWT CONFIGURATION PERFEITA
const JWT_CONFIG = {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    issuer: 'your-app-name',
    audience: 'your-app-users',
    algorithm: 'HS256'
};

// ✅ FUNÇÃO DEFINITIVA para criar JWT
function createTokens(payload) {
    const accessToken = jwt.sign(
        {
            ...payload,
            type: 'access',
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: JWT_CONFIG.accessTokenExpiry,
            issuer: JWT_CONFIG.issuer,
            audience: JWT_CONFIG.audience,
            algorithm: JWT_CONFIG.algorithm
        }
    );
    
    const refreshToken = jwt.sign(
        {
            userId: payload.userId,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: JWT_CONFIG.refreshTokenExpiry,
            issuer: JWT_CONFIG.issuer,
            audience: JWT_CONFIG.audience,
            algorithm: JWT_CONFIG.algorithm
        }
    );
    
    return { accessToken, refreshToken };
}

// ✅ MIDDLEWARE DEFINITIVO de autenticação
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        logger.security('Missing authentication token', { 
            ip: req.ip, 
            userAgent: req.get('User-Agent'),
            endpoint: req.path
        });
        return res.status(401).json({ 
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
            issuer: JWT_CONFIG.issuer,
            audience: JWT_CONFIG.audience
        });
        
        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        logger.security('Invalid authentication token', { 
            ip: req.ip,
            error: error.message,
            endpoint: req.path
        });
        
        return res.status(403).json({ 
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }
};
```

#### **✅ RATE LIMITING ANTI-BRUTE FORCE:**
```javascript
// ✅ RATE LIMITING DEFINITIVO
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// ✅ Rate limiter agressivo para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 tentativas por IP
    message: {
        error: 'Too many login attempts',
        retryAfter: 15,
        code: 'RATE_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.security('Rate limit exceeded for login', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(429).json({
            error: 'Too many login attempts',
            retryAfter: 15,
            code: 'RATE_LIMITED'
        });
    }
});

// ✅ Slow down progressivo
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutos
    delayAfter: 2, // Slow down após 2 requests
    delayMs: 500 // Adicionar 500ms delay a cada request
});

// ✅ Account lockout por user
const accountLockout = new Map();

const checkAccountLockout = (req, res, next) => {
    const { email } = req.body;
    const attempts = accountLockout.get(email) || { count: 0, lockUntil: 0 };
    
    if (attempts.lockUntil > Date.now()) {
        const remainingTime = Math.ceil((attempts.lockUntil - Date.now()) / 1000 / 60);
        logger.security('Account locked - access attempt', { email, ip: req.ip });
        
        return res.status(423).json({
            error: `Account locked. Try again in ${remainingTime} minutes`,
            code: 'ACCOUNT_LOCKED'
        });
    }
    
    req.accountAttempts = attempts;
    next();
};

const updateAccountAttempts = (email, success) => {
    if (success) {
        accountLockout.delete(email);
    } else {
        const attempts = accountLockout.get(email) || { count: 0, lockUntil: 0 };
        attempts.count++;
        
        if (attempts.count >= 5) {
            attempts.lockUntil = Date.now() + (30 * 60 * 1000); // Lock por 30 min
            logger.security('Account locked due to failed attempts', { email });
        }
        
        accountLockout.set(email, attempts);
    }
};
```

---

## 📁 **FILE SYSTEM SECURITY** <a name="file-system-security"></a>

### **🛡️ PATH TRAVERSAL PREVENTION DEFINITIVA**

#### **✅ VALIDAÇÃO DE PATH BULLETPROOF:**
```javascript
const path = require('path');
const fs = require('fs').promises;

// ✅ WHITELIST definitiva de extensões permitidas
const ALLOWED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.doc', '.docx', '.txt',
    '.csv', '.xlsx'
]);

// ✅ BLACKLIST definitiva de extensões perigosas
const DANGEROUS_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.sh', '.ps1',
    '.js', '.php', '.jsp', '.asp', '.py',
    '.rb', '.pl', '.lua', '.vbs', '.scr'
]);

// ✅ FUNÇÃO DEFINITIVA de validação de path
function validateFilePath(filePath, allowedDirectory) {
    try {
        // 1. Normalizar path
        const normalizedPath = path.normalize(filePath);
        
        // 2. Detectar path traversal
        if (normalizedPath.includes('..') || 
            normalizedPath.includes('~') ||
            normalizedPath.includes('\\') ||
            normalizedPath.startsWith('/')) {
            throw new Error('Path traversal detected');
        }
        
        // 3. Resolver paths absolutos
        const absoluteFilePath = path.resolve(allowedDirectory, normalizedPath);
        const absoluteAllowedDir = path.resolve(allowedDirectory);
        
        // 4. Verificar se está dentro do diretório permitido
        if (!absoluteFilePath.startsWith(absoluteAllowedDir + path.sep)) {
            throw new Error('File outside allowed directory');
        }
        
        // 5. Validar extensão
        const extension = path.extname(normalizedPath).toLowerCase();
        
        if (DANGEROUS_EXTENSIONS.has(extension)) {
            throw new Error('File type not allowed');
        }
        
        if (!ALLOWED_EXTENSIONS.has(extension)) {
            throw new Error('File type not supported');
        }
        
        // 6. Validar nome do arquivo
        const filename = path.basename(normalizedPath);
        const filenameRegex = /^[a-zA-Z0-9._-]+$/;
        
        if (!filenameRegex.test(filename)) {
            throw new Error('Invalid filename characters');
        }
        
        if (filename.length > 255) {
            throw new Error('Filename too long');
        }
        
        return absoluteFilePath;
        
    } catch (error) {
        logger.security('File path validation failed', {
            filePath,
            allowedDirectory,
            error: error.message
        });
        throw error;
    }
}

// ✅ FUNÇÃO DEFINITIVA para leitura segura de arquivos
async function readFileSecurely(filePath, allowedDirectory, maxSize = 10 * 1024 * 1024) {
    try {
        // Validar path
        const validatedPath = validateFilePath(filePath, allowedDirectory);
        
        // Verificar se arquivo existe
        const stats = await fs.stat(validatedPath);
        
        // Verificar tamanho
        if (stats.size > maxSize) {
            throw new Error('File too large');
        }
        
        // Verificar se é realmente um arquivo
        if (!stats.isFile()) {
            throw new Error('Not a file');
        }
        
        // Ler arquivo
        return await fs.readFile(validatedPath);
        
    } catch (error) {
        logger.security('Secure file read failed', {
            filePath,
            error: error.message
        });
        throw error;
    }
}

// ✅ UPLOAD DE ARQUIVOS SEGURO
const multer = require('multer');
const crypto = require('crypto');

const secureStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads', req.user.id);
        fs.mkdir(uploadDir, { recursive: true })
            .then(() => cb(null, uploadDir))
            .catch(err => cb(err));
    },
    filename: (req, file, cb) => {
        // Gerar nome único e seguro
        const uniqueName = crypto.randomUUID();
        const extension = path.extname(file.originalname).toLowerCase();
        
        // Validar extensão
        if (!ALLOWED_EXTENSIONS.has(extension)) {
            return cb(new Error('File type not allowed'));
        }
        
        cb(null, `${uniqueName}${extension}`);
    }
});

const uploadLimits = {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5 // Máximo 5 arquivos por vez
};

const fileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Verificar MIME type vs extensão
    const mimeExtensions = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'application/pdf': ['.pdf']
    };
    
    const allowedMimes = mimeExtensions[file.mimetype];
    if (!allowedMimes || !allowedMimes.includes(extension)) {
        logger.security('MIME type mismatch detected', {
            originalName: file.originalname,
            mimetype: file.mimetype,
            extension,
            ip: req.ip
        });
        return cb(new Error('File type mismatch'));
    }
    
    cb(null, true);
};

const secureUpload = multer({
    storage: secureStorage,
    limits: uploadLimits,
    fileFilter
});
```

#### **❌ ANTI-PATTERNS MORTAIS:**
```javascript
// ❌ MORTE CERTA: readFile sem validação
const userPath = req.body.filePath;
fs.readFile(userPath, callback); // Path traversal vulnerability!

// ❌ MORTE CERTA: require dinâmico
const moduleName = req.query.module;
const module = require(moduleName); // RCE vulnerability!

// ❌ MORTE CERTA: Path concatenação sem validação
const filePath = './uploads/' + req.params.filename; // Directory traversal!

// ❌ MORTE CERTA: Upload sem validação
app.post('/upload', upload.single('file'), (req, res) => {
    // Sem validação = shell upload possível
});
```

---

## 🌐 **WEB & API SECURITY** <a name="web--api-security"></a>

### **🛡️ HTTPS & HEADERS SECURITY DEFINITIVA**

#### **✅ SECURITY HEADERS OBRIGATÓRIOS:**
```javascript
const helmet = require('helmet');
const express = require('express');

// ✅ HELMET CONFIGURATION DEFINITIVA
const helmetConfig = {
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Só se absolutamente necessário
                "https://cdn.jsdelivr.net",
                "https://unpkg.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https:"
            ],
            connectSrc: [
                "'self'",
                "https://api.yourservice.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com"
            ],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    
    // HTTP Strict Transport Security
    hsts: {
        maxAge: 31536000, // 1 ano
        includeSubDomains: true,
        preload: true
    },
    
    // X-Frame-Options
    frameguard: { action: 'deny' },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // Referrer Policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    
    // Remove X-Powered-By
    hidePoweredBy: true
};

// ✅ MIDDLEWARE DEFINITIVO de security headers
const securityHeaders = (req, res, next) => {
    // Security headers básicos
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // HTTPS enforcement
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Cache control para rotas sensíveis
    if (req.path.includes('/api/') || req.path.includes('/admin/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    next();
};

app.use(helmet(helmetConfig));
app.use(securityHeaders);
```

#### **✅ CORS SECURITY DEFINITIVA:**
```javascript
const cors = require('cors');

// ✅ CORS CONFIGURATION POR AMBIENTE
const getCorsConfig = () => {
    const corsConfig = {
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'X-CSRF-Token'
        ]
    };
    
    if (process.env.NODE_ENV === 'production') {
        corsConfig.origin = [
            'https://yourdomain.com',
            'https://www.yourdomain.com',
            'https://app.yourdomain.com'
        ];
    } else {
        corsConfig.origin = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000'
        ];
    }
    
    return corsConfig;
};

// ✅ CORS com validation
const corsWithValidation = cors({
    ...getCorsConfig(),
    origin: (origin, callback) => {
        const allowedOrigins = getCorsConfig().origin;
        
        // Permitir requests sem origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.security('CORS violation detected', { origin, ip: req.ip });
            callback(new Error('Not allowed by CORS'));
        }
    }
});

app.use(corsWithValidation);
```

#### **✅ CSRF PROTECTION DEFINITIVA:**
```javascript
const csrf = require('csurf');

// ✅ CSRF CONFIGURATION SEGURA
const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hora
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    value: (req) => {
        // Suportar CSRF token em header ou body
        return req.body._csrf ||
               req.query._csrf ||
               req.headers['x-csrf-token'] ||
               req.headers['x-xsrf-token'];
    }
});

// ✅ Endpoint para obter CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// ✅ Double Submit Cookie pattern (alternativa)
const doubleSubmitCookie = (req, res, next) => {
    if (req.method === 'GET') return next();
    
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const cookieToken = req.cookies['csrf-token'];
    
    if (!token || token !== cookieToken) {
        logger.security('CSRF token mismatch', { ip: req.ip });
        return res.status(403).json({ error: 'CSRF token invalid' });
    }
    
    next();
};

---

## 🧹 **CÓDIGO LIMPO & ESTRUTURA**

### **🚨 REGRA CRÍTICA: COMPLEXIDADE CICLOMÁTICA - ZERO TOLERÂNCIA**

#### **⚡ NUNCA MAIS ERRAR COM REFATORAÇÃO DE COMPLEXIDADE:**

**❌ ERROS MORTAIS QUE CRIAM NOVOS PROBLEMAS:**

```javascript
// ❌ ERRO FATAL: Função auxiliar com muitas operações ||
const mapDataToForm = (data: any): FormData => ({
  field1: data.field1 || '',     // +1
  field2: data.field2 || '',     // +1  
  field3: data.field3 || '',     // +1
  field4: data.field4 || '',     // +1
  // ... 11 campos com ||         // = 11 + 1 = 12 COMPLEXIDADE!
})

// ❌ ERRO FATAL: Função auxiliar com condições aninhadas
function processData(input: string): string {
  if (input.startsWith('+')) {           // +1
    if (input.includes('351')) {         // +1
      return processPortuguese(input);
    } else if (input.length > 10) {     // +1
      return processInternational(input);
    }
  }
  return input; // TOTAL: 1 + 1 + 1 + 1 = 4 (OK, mas pode crescer!)
}
```

**✅ SOLUÇÕES BULLETPROOF:**

```javascript
// ✅ SOLUÇÃO 1: Função utilitária simples para múltiplos campos
const getSafeValue = (data: any, field: string): string => data?.[field] ?? '';

const mapDataToForm = (data: any): FormData => {
  const getValue = (field: string) => getSafeValue(data, field);
  
  return {
    field1: getValue('field1'),
    field2: getValue('field2'),
    field3: getValue('field3'),
    // ... sem operadores condicionais = COMPLEXIDADE 1!
  };
};

// ✅ SOLUÇÃO 2: Mapa de configuração para eliminar condições
const PHONE_PROCESSORS = {
  '+351': processPortuguese,
  'international': processInternational,
  'default': processDefault
};

function processData(input: string): string {
  const processor = input.startsWith('+351') ? PHONE_PROCESSORS['+351'] :
                   input.length > 10 ? PHONE_PROCESSORS['international'] :
                   PHONE_PROCESSORS['default'];
  
  return processor(input); // COMPLEXIDADE: 1 (operador ternário conta como 1 total)
}
```

#### **🔍 CHECKLIST OBRIGATÓRIO ANTES DE CADA REFATORAÇÃO:**

**ANTES DE REFATORAR:**
1. ✅ **Contar operadores na função original**: `if`, `&&`, `||`, `?:`, `case`, `catch`
2. ✅ **Identificar o número exato de condições**
3. ✅ **Planejar divisão SEM criar novas condições**

**DURANTE A REFATORAÇÃO:**
4. ✅ **Cada função auxiliar = MÁXIMO 3 condições**
5. ✅ **Preferir mapas/objetos a múltiplos `if/else`**
6. ✅ **Evitar operadores `||` em massa**
7. ✅ **Uma responsabilidade = uma função**

**APÓS A REFATORAÇÃO:**
8. ✅ **Contar complexidade de CADA função auxiliar criada**
9. ✅ **Verificar se soma total < complexidade original**
10. ✅ **Testar que funcionalidade não quebrou**

#### **📊 FÓRMULA DE COMPLEXIDADE CICLOMÁTICA:**
```
COMPLEXIDADE = 1 (base) + número de:
- if statements
- else if statements  
- while/for loops
- && operators
- || operators
- ?: ternary operators
- catch blocks
- case statements
- && em conditions
- || em conditions
```

#### **🎯 ESTRATÉGIAS ANTI-COMPLEXIDADE:**

**ESTRATÉGIA 1: Mapa de Funções**
```javascript
// ❌ Complexidade alta
function handleAction(type: string) {
  if (type === 'create') return createHandler();
  if (type === 'update') return updateHandler();  
  if (type === 'delete') return deleteHandler();
  // ... +3 complexidade
}

// ✅ Complexidade 1
const ACTION_HANDLERS = {
  create: createHandler,
  update: updateHandler,
  delete: deleteHandler
};

function handleAction(type: string) {
  return ACTION_HANDLERS[type]?.() || defaultHandler();
}
```

**ESTRATÉGIA 2: Early Returns**
```javascript
// ❌ Condições aninhadas
function validate(data: any) {
  if (data) {
    if (data.email) {
      if (data.email.includes('@')) {
        return true;
      }
    }
  }
  return false;
}

// ✅ Early returns
function validate(data: any) {
  if (!data) return false;
  if (!data.email) return false;
  if (!data.email.includes('@')) return false;
  return true;
}
```

**ESTRATÉGIA 3: Função de Configuração**
```javascript
// ❌ Múltiplas condições
function getConfig(env: string) {
  return {
    apiUrl: env === 'prod' ? 'prod-url' : env === 'staging' ? 'staging-url' : 'dev-url',
    timeout: env === 'prod' ? 5000 : env === 'staging' ? 3000 : 1000,
    // +6 operadores ternários
  };
}

// ✅ Objeto de configuração
const ENV_CONFIGS = {
  prod: { apiUrl: 'prod-url', timeout: 5000 },
  staging: { apiUrl: 'staging-url', timeout: 3000 },
  dev: { apiUrl: 'dev-url', timeout: 1000 }
};

function getConfig(env: string) {
  return ENV_CONFIGS[env] || ENV_CONFIGS.dev;
}
```

#### **🚨 REGRA DE OURO FINAL:**
**"NUNCA REFATORAR SEM MEDIR A COMPLEXIDADE DE CADA FUNÇÃO AUXILIAR CRIADA"**

#### **💡 FERRAMENTAS PARA MEDIR COMPLEXIDADE:**
- **Manual**: Contar cada `if`, `&&`, `||`, `?:`, `case`, `catch`
- **ESLint**: `complexity` rule com limite 8
- **SonarQube/Codacy**: Análise automática
- **VS Code**: Extensões como "CodeMetrics"

---

## 🛡️ **ULTRA PROMPT: COMPLEXIDADE CICLOMÁTICA - ZERO ERROS GARANTIDOS**
### **PROMPT DEFINITIVO PARA REDUÇÃO DE COMPLEXIDADE COM MCP CONTEXT**

#### **🎯 OBJETIVO ABSOLUTO**
**NUNCA MAIS aumentar complexidade ciclomática. SEMPRE diminuir. ZERO tolerância para erros.**

#### **🚨 REGRAS ABSOLUTAS - NUNCA VIOLAR**

##### **⚡ REGRA DE OURO:**
```
ANTES de qualquer refatoração:
1. CONTAR complexidade da função original
2. PLANEJAR redução SEM criar novas condições
3. MEDIR complexidade de CADA função auxiliar criada
4. VERIFICAR que soma total < original
5. TESTAR que funcionalidade não quebrou
```

##### **📊 FÓRMULA MATEMÁTICA OBRIGATÓRIA:**
```
COMPLEXIDADE = 1 (base) + SOMA de:
- if/else if statements
- while/for loops  
- && operators
- || operators
- ?: ternary operators
- catch blocks
- case statements em switch
- Cada condição em expressões booleanas
```

#### **🔥 ESTRATÉGIAS ANTI-COMPLEXIDADE BULLETPROOF**

##### **ESTRATÉGIA 1: MAPA DE CONFIGURAÇÃO**
```javascript
// ❌ COMPLEXIDADE ALTA (7 pontos)
function getRedirectUrl(role: string, metadata: any): string {
  if (role === 'admin') return '/admin';
  if (role === 'user') return '/user';
  if (role === 'guest') return '/guest';
  if (metadata && metadata.premium) return '/premium';
  return '/default';
}

// ✅ COMPLEXIDADE 1
const ROLE_REDIRECTS = {
  admin: '/admin',
  user: '/user', 
  guest: '/guest'
};

function getRedirectUrl(role: string, metadata: any): string {
  if (metadata?.premium) return '/premium';
  return ROLE_REDIRECTS[role] || '/default';
}
```

##### **ESTRATÉGIA 2: EARLY RETURNS**
```javascript
// ❌ COMPLEXIDADE ALTA (aninhamento)
function validateUser(user: any): boolean {
  if (user) {
    if (user.email) {
      if (user.email.includes('@')) {
        if (user.password) {
          if (user.password.length >= 8) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// ✅ COMPLEXIDADE 5 (linear)
function validateUser(user: any): boolean {
  if (!user) return false;
  if (!user.email) return false;
  if (!user.email.includes('@')) return false;
  if (!user.password) return false;
  if (user.password.length < 8) return false;
  return true;
}
```

##### **ESTRATÉGIA 3: FUNÇÃO UTILITÁRIA PARA MÚLTIPLOS CAMPOS**
```javascript
// ❌ COMPLEXIDADE MORTAL (12+ pontos)
const mapFormData = (data: any) => ({
  field1: data.field1 || '',     // +1
  field2: data.field2 || '',     // +1
  field3: data.field3 || '',     // +1
  field4: data.field4 || '',     // +1
  // ... 10 campos = 10+ complexidade!
});

// ✅ COMPLEXIDADE 1
const getSafeValue = (data: any, field: string): string => data?.[field] ?? '';

const mapFormData = (data: any) => {
  const getValue = (field: string) => getSafeValue(data, field);
  return {
    field1: getValue('field1'),
    field2: getValue('field2'),
    field3: getValue('field3'),
    // ... sem operadores condicionais!
  };
};
```

##### **ESTRATÉGIA 4: PATTERN MATCHING COM OBJETOS**
```javascript
// ❌ COMPLEXIDADE ALTA
function processAction(type: string, data: any) {
  if (type === 'CREATE' && data.valid) return createHandler(data);
  if (type === 'UPDATE' && data.valid) return updateHandler(data);
  if (type === 'DELETE' && data.valid) return deleteHandler(data);
  if (type === 'VALIDATE') return validateHandler(data);
  return errorHandler();
}

// ✅ COMPLEXIDADE 2
const ACTION_PROCESSORS = {
  CREATE: (data: any) => data.valid ? createHandler(data) : errorHandler(),
  UPDATE: (data: any) => data.valid ? updateHandler(data) : errorHandler(), 
  DELETE: (data: any) => data.valid ? deleteHandler(data) : errorHandler(),
  VALIDATE: validateHandler
};

function processAction(type: string, data: any) {
  const processor = ACTION_PROCESSORS[type];
  return processor ? processor(data) : errorHandler();
}
```

#### **🔍 CHECKLIST PRÉ-REFATORAÇÃO OBRIGATÓRIO**

##### **📋 ANTES DE TOCAR NO CÓDIGO:**
```
□ Li a função original completamente
□ Contei EXATAMENTE quantos if/else/&&/||/?:/case existem
□ Calculei complexidade original (base 1 + operadores)
□ Identifiquei responsabilidades da função
□ Planejei divisão SEM criar condições extras
□ Defini estratégia (mapa, early returns, utilitária)
```

##### **⚡ DURANTE A REFATORAÇÃO:**
```
□ Cada função auxiliar tem MÁXIMO 3 condições
□ Usei mapas/objetos em vez de múltiplos if/else
□ Evitei operadores || em massa
□ Apliquei early returns para reduzir aninhamento
□ Uma responsabilidade = uma função
□ Nomes descritivos para cada função auxiliar
```

##### **✅ APÓS REFATORAÇÃO:**
```
□ Contei complexidade de CADA função auxiliar criada
□ Somei complexidades: original vs (principal + auxiliares)
□ Confirmei que TOTAL < ORIGINAL
□ Testei que funcionalidade não quebrou
□ Verificei linting sem erros
□ Executei build com sucesso
```

#### **🎯 ESTRATÉGIAS POR TIPO DE FUNÇÃO**

##### **TIPO 1: VALIDAÇÃO/PARSING**
```javascript
// Use: Early Returns + Função Utilitária
function parseData(input: string): ParsedData | null {
  if (!input) return null;
  if (input.length < 5) return null;
  if (!input.includes('@')) return null;
  
  const parts = input.split('@');
  return createParsedData(parts);
}
```

##### **TIPO 2: MAPEAMENTO DE DADOS**
```javascript
// Use: Função Utilitária + Objeto de Configuração
const FIELD_MAPPINGS = {
  name: 'full_name',
  email: 'email_address',
  phone: 'phone_number'
};

function mapUserData(source: any): UserData {
  const getValue = (sourceField: string, targetField: string) => 
    source[sourceField] ?? getDefaultValue(targetField);
    
  return Object.entries(FIELD_MAPPINGS).reduce((acc, [src, target]) => ({
    ...acc,
    [target]: getValue(src, target)
  }), {} as UserData);
}
```

##### **TIPO 3: PROCESSAMENTO CONDICIONAL**
```javascript
// Use: Mapa de Processadores
const DATA_PROCESSORS = {
  user: processUserData,
  admin: processAdminData,
  guest: processGuestData
};

function processData(type: string, data: any) {
  const processor = DATA_PROCESSORS[type] || DATA_PROCESSORS.guest;
  return processor(data);
}
```

##### **TIPO 4: CONFIGURAÇÃO/SETUP**
```javascript
// Use: Objeto de Configuração + Factory Pattern
const CONFIG_BUILDERS = {
  development: () => ({ debug: true, timeout: 1000 }),
  production: () => ({ debug: false, timeout: 5000 }),
  test: () => ({ debug: true, timeout: 500 })
};

function buildConfig(env: string) {
  const builder = CONFIG_BUILDERS[env] || CONFIG_BUILDERS.development;
  return builder();
}
```

#### **🛠️ FERRAMENTAS DE MEDIÇÃO**

##### **MANUAL (OBRIGATÓRIO):**
```javascript
// Contar manualmente:
function example(a: string, b: number): string {
  // Base: 1
  if (a.length > 0) {           // +1 = 2
    if (b > 10 && b < 100) {    // +2 (if + &&) = 4
      return a.toUpperCase();
    } else if (b === 0) {       // +1 = 5
      return a.toLowerCase();
    }
  }
  return a || 'default';        // +1 (||) = 6
}
// TOTAL: 6 pontos de complexidade
```

##### **AUTOMÁTICO:**
```json
// .eslintrc.json
{
  "rules": {
    "complexity": ["error", { "max": 8 }]
  }
}
```

#### **🚨 ANTI-PATTERNS MORTAIS - NUNCA FAZER**

##### **❌ MORTE INSTANTÂNEA 1: || EM MASSA**
```javascript
// ❌ COMPLEXIDADE 12+
const data = {
  a: input.a || '',
  b: input.b || '',
  c: input.c || '',
  // ... cada || = +1 complexidade
};
```

##### **❌ MORTE INSTANTÂNEA 2: CONDIÇÕES ANINHADAS**
```javascript
// ❌ COMPLEXIDADE EXPONENCIAL
if (user) {
  if (user.role) {
    if (user.role === 'admin') {
      if (user.permissions) {
        if (user.permissions.includes('write')) {
          // ...
        }
      }
    }
  }
}
```

##### **❌ MORTE INSTANTÂNEA 3: SWITCH GIGANTE**
```javascript
// ❌ COMPLEXIDADE = casos + nested ifs
switch (type) {
  case 'A':
    if (data.valid) return processA(data);
    break;
  case 'B':
    if (data.valid && data.premium) return processB(data);
    break;
  // ... cada case + if = +2 complexidade
}
```

#### **🎯 METAS DE REDUÇÃO POR COMPLEXIDADE ORIGINAL**

##### **COMPLEXIDADE 8-12 (Baixo Risco):**
```
Meta: Reduzir para 3-5
Estratégia: Early Returns + 1 função auxiliar
Tempo: 5-10 minutos
```

##### **COMPLEXIDADE 13-20 (Médio Risco):**
```
Meta: Reduzir para 4-6
Estratégia: Mapa + 2-3 funções auxiliares
Tempo: 15-20 minutos
```

##### **COMPLEXIDADE 21+ (Alto Risco):**
```
Meta: Reduzir para 5-7
Estratégia: Múltiplas estratégias + 4+ funções auxiliares
Tempo: 30+ minutos
```

#### **📊 TRACKING DE PROGRESSO**

##### **TEMPLATE DE REFATORAÇÃO:**
```markdown
## REFATORAÇÃO: [nome_da_função]

### ANTES:
- Complexidade Original: X
- Número de condições: Y
- Responsabilidades: [listar]

### ESTRATÉGIA:
- [Early Returns / Mapa / Utilitária / etc.]

### FUNÇÕES AUXILIARES CRIADAS:
1. funcao1(): Complexidade Z1
2. funcao2(): Complexidade Z2

### DEPOIS:
- Complexidade Principal: A
- Complexidade Total: A + Z1 + Z2 = TOTAL
- Redução: X - TOTAL = MELHORIA
- ✅ Funcionalidade preservada
- ✅ Testes passaram
```

#### **🔥 ULTRA PROMPT PARA IA/ASSISTANT**

```
CONTEXTO: Sou um assistant que NUNCA MAIS pode aumentar complexidade ciclomática.

REGRAS ABSOLUTAS:
1. SEMPRE contar complexidade original antes de refatorar
2. SEMPRE usar estratégias anti-complexidade (mapas, early returns, utilitárias)
3. SEMPRE medir complexidade de cada função auxiliar criada
4. SEMPRE verificar que soma total < original
5. NUNCA usar || em massa ou condições aninhadas

ESTRATÉGIAS OBRIGATÓRIAS:
- Complexidade 8-12: Early Returns + 1 auxiliar
- Complexidade 13-20: Mapa + 2-3 auxiliares  
- Complexidade 21+: Múltiplas estratégias + 4+ auxiliares

VERIFICAÇÃO FINAL:
- Contar: Original X vs Total Y
- Confirmar: Y < X (redução obrigatória)
- Testar: Funcionalidade preservada

SE NÃO CONSEGUIR REDUZIR: Parar e pedir ajuda em vez de piorar.
```

#### **🛡️ GARANTIA DE QUALIDADE**

##### **ANTES DE COMMIT:**
```bash
# 1. Verificar complexidade
npm run lint

# 2. Verificar build
npm run build

# 3. Verificar testes
npm test

# 4. Commit apenas se TUDO passou
git commit -m "refactor: reduce complexity [função] (X→Y points)"
```

##### **APÓS COMMIT:**
```
□ Codacy mostra redução de complexidade
□ Nenhum novo erro introduzido
□ Quality gate melhorou ou manteve
□ Issues count diminuiu
```

#### **🎯 RESULTADO FINAL GARANTIDO**

**COM ESTE ULTRA PROMPT:**
- ✅ Complexidade SEMPRE diminui
- ✅ ZERO novos erros criados
- ✅ Qualidade do código melhora
- ✅ Funcionalidade preservada
- ✅ Codacy Quality Gate passa

**SEM ESTE PROMPT:**
- ❌ Complexidade pode aumentar
- ❌ Novos erros são criados
- ❌ Qualidade degrada
- ❌ Quality Gate falha
- ❌ Technical debt aumenta

---

## 🚨 **REGRAS ABSOLUTAS PARA AGENTS/IA - NUNCA VIOLAR**

### **⚡ REGRA DE OURO PARA AGENTS:**
```
ANTES de qualquer refatoração de complexidade:
1. LER completamente o @regrascodacy.md
2. APLICAR a fórmula matemática em CADA função auxiliar
3. CONTAR manualmente cada if, &&, ||, ?:, case, catch
4. VERIFICAR que SOMA TOTAL < ORIGINAL
5. SE não conseguir reduzir: PARAR e pedir ajuda
```

### **🔢 FÓRMULA OBRIGATÓRIA PARA AGENTS:**
```
PARA CADA FUNÇÃO AUXILIAR CRIADA:
COMPLEXIDADE = 1 (base) + CONTAR:
- if statements (cada if = +1)
- else if statements (cada else if = +1)
- && operators (cada && = +1)
- || operators (cada || = +1)
- ?: ternary operators (cada ternário = +1)
- typeof checks (cada typeof = +1)
- !== comparisons (cada !== = +1)
- === comparisons (cada === = +1)
- > < >= <= comparisons (cada = +1)
- case statements (cada case = +1)
- catch blocks (cada catch = +1)
- early returns com condição (cada return com if = +1)
```

### **❌ ERROS MORTAIS QUE AGENTS COMETEM:**
```
❌ ERRO FATAL 1: "Early returns são sempre simples"
   REALIDADE: if + return = 2 pontos CADA UM!
   
❌ ERRO FATAL 2: "Dividir função = reduzir complexidade"  
   REALIDADE: 1 função (20 pontos) → 4 funções (8+7+6+5 = 26 pontos) = PIOR!
   
❌ ERRO FATAL 3: "Validações são simples"
   REALIDADE: typeof + !== + && = 3+ pontos CADA validação!
   
❌ ERRO FATAL 4: "Não preciso medir funções auxiliares"
   REALIDADE: CADA função auxiliar DEVE ser medida!
```

### **✅ ESTRATÉGIAS CORRETAS PARA AGENTS:**
```
✅ ESTRATÉGIA 1: MAPA DE CONFIGURAÇÃO (Complexidade: 1)
const VALIDATORS = {
  string: (val) => typeof val === 'string',
  number: (val) => typeof val === 'number',
  email: (val) => /\S+@\S+\.\S+/.test(val)
};

✅ ESTRATÉGIA 2: ARRAY.EVERY/SOME (Complexidade: 1-2)
const isValid = REQUIRED_FIELDS.every(field => data[field]);

✅ ESTRATÉGIA 3: FUNÇÃO UTILITÁRIA REUTILIZÁVEL (Complexidade: 1)
const getSafeValue = (obj, key) => obj?.[key] ?? '';
```

### **🔍 CHECKLIST OBRIGATÓRIO PARA AGENTS:**
```
ANTES DE CRIAR FUNÇÃO AUXILIAR:
□ Contei quantos if/else/&&/||/?:/case vou usar?
□ Apliquei a fórmula matemática?
□ Complexidade vai ser ≤ 3 pontos?
□ Posso usar mapa/configuração em vez de condições?

DEPOIS DE CRIAR FUNÇÃO AUXILIAR:
□ Contei a complexidade real da função criada?
□ Somei: Original vs (Principal + Todas Auxiliares)?
□ Confirmei que TOTAL < ORIGINAL?
□ Se não consegui reduzir: PAREI e pedi ajuda?
```

### **📊 TEMPLATE DE VERIFICAÇÃO PARA AGENTS:**
```markdown
## REFATORAÇÃO: [nome_da_função]

### ANTES:
- Complexidade Original: X pontos
- Número de condições: Y

### FUNÇÕES AUXILIARES CRIADAS:
1. funcao1(): CONTEI X pontos (if=?, &&=?, ||=?, etc.)
2. funcao2(): CONTEI Y pontos (if=?, &&=?, ||=?, etc.)
3. funcao3(): CONTEI Z pontos (if=?, &&=?, ||=?, etc.)

### VERIFICAÇÃO MATEMÁTICA:
- Complexidade Original: X
- Complexidade Nova: A + Y + Z = TOTAL
- Redução: X - TOTAL = ? (DEVE SER POSITIVO!)

### RESULTADO:
□ TOTAL < ORIGINAL? (SIM/NÃO)
□ Se NÃO: PARAR e usar estratégia diferente
□ Se SIM: Prosseguir com confiança
```

### **🚨 REGRA FINAL PARA AGENTS:**
```
SE APÓS REFATORAÇÃO:
- Codacy mostrar NOVOS erros de complexidade
- Issues count AUMENTAR em vez de diminuir
- Aparecerem erros em funções que criei

ENTÃO:
- EU VIOLEI as regras do @regrascodacy.md
- DEVO admitir o erro imediatamente
- DEVO aprender com o erro
- DEVO aplicar as estratégias corretas
```

---

## 🚨 **SISTEMA ANTI-FALHA DEFINITIVO - ZERO ERROS GARANTIDOS**
### **CHECKLIST OBRIGATÓRIO PARA AGENTS/IA - NUNCA PULAR**

#### **⚡ ANTES DE QUALQUER REFATORAÇÃO:**

```markdown
## ✅ PASSO 1: INVENTÁRIO COMPLETO
□ Listo TODOS os arquivos que vou modificar
□ Listo TODOS os arquivos novos que vou criar  
□ Leio COMPLETAMENTE cada arquivo
□ Identifico TODAS as funções que serão alteradas

## ✅ PASSO 2: CONTAGEM MANUAL OBRIGATÓRIA
Para CADA função (nova ou modificada):
□ Conto MANUALMENTE: if, else if, &&, ||, ?:, catch, case, typeof
□ Escrevo a fórmula: 1 + X + Y + Z = TOTAL
□ Verifico se TOTAL ≤ 8
□ Se > 8: PARO e aplico estratégias anti-complexidade

## ✅ PASSO 3: ESTRATÉGIA POR COMPLEXIDADE
□ Se 1-8: OK, prosseguir
□ Se 9-15: Aplicar 1 estratégia (mapa OU early returns)  
□ Se 16+: Aplicar múltiplas estratégias obrigatoriamente

## ✅ PASSO 4: VERIFICAÇÃO MATEMÁTICA
□ Complexidade Original: X pontos
□ Complexidade Nova: A + B + C = TOTAL
□ Confirmo que TOTAL < X (OBRIGATÓRIO)
□ Se TOTAL ≥ X: PARO e uso estratégia diferente

## ✅ PASSO 5: TESTE ANTES DE COMMIT
□ npm run build (sem erros)
□ Verifico se há novos erros no linter
□ Se há NOVOS erros: PARO e corrijo IMEDIATAMENTE
□ Testo funcionalidade não quebrou
```

#### **📊 TEMPLATE DE ANÁLISE OBRIGATÓRIO:**

```markdown
## ANÁLISE DE COMPLEXIDADE: [nome_função]

### CONTAGEM MANUAL:
```javascript
function exemplo() {
  if (a?.b) {           // +2 (if + ?.)
    return b || c;      // +1 (||)
  }
  try {                 // +1 (try/catch)
    // code
  } catch (e) {         // +1 (catch explícito)
    // error
  }
}
// BASE: 1
// TOTAL: 1 + 2 + 1 + 1 + 1 = 6 pontos
```

### ESTRATÉGIA APLICADA:
- [x] Mapa de configuração
- [ ] Early returns
- [ ] Função utilitária
- [ ] Divisão por responsabilidade

### VERIFICAÇÃO FINAL:
- Complexidade Original: X
- Complexidade Nova: Y  
- Redução: X - Y = Z (DEVE SER POSITIVO)
- ✅ Build sem erros
- ✅ Funcionalidade preservada
```

#### **🔥 FÓRMULA EXPANDIDA DE COMPLEXIDADE:**

```
COMPLEXIDADE = 1 (base) + SOMA de:
- if statements (+1 cada)
- else if statements (+1 cada)  
- while/for loops (+1 cada)
- && operators (+1 cada)
- || operators (+1 cada)
- ?. optional chaining (+1 cada)
- ?: ternary operators (+1 cada)
- catch blocks (+1 cada)
- case statements (+1 cada)
- typeof checks (+1 cada)
- !== comparisons (+1 cada)
- === comparisons (+1 cada)
- > < >= <= comparisons (+1 cada)
- early returns com condição (+1 cada)
```

#### **🛡️ ESTRATÉGIAS ANTI-COMPLEXIDADE AVANÇADAS:**

##### **ESTRATÉGIA 1: MAPA DE VALIDADORES**
```javascript
// ❌ Complexidade 8+
function validate(data) {
  if (!data.email) return false;
  if (!data.email.includes('@')) return false;
  if (!data.password) return false;
  if (data.password.length < 8) return false;
  if (!/[A-Z]/.test(data.password)) return false;
  return true;
}

// ✅ Complexidade 2
const VALIDATORS = {
  email: (val) => val && val.includes('@'),
  password: (val) => val && val.length >= 8 && /[A-Z]/.test(val)
};

function validate(data) {
  const failures = Object.entries(VALIDATORS)
    .filter(([key, validator]) => !validator(data[key]));
  return failures.length === 0;
}
```

##### **ESTRATÉGIA 2: CONFIGURATION-DRIVEN LOGIC**
```javascript
// ❌ Complexidade 10+
function processUser(user, type) {
  if (type === 'admin') {
    if (user.permissions.includes('write')) {
      return processAdminWrite(user);
    } else if (user.permissions.includes('read')) {
      return processAdminRead(user);
    }
  } else if (type === 'user') {
    if (user.verified) {
      return processVerifiedUser(user);
    } else {
      return processUnverifiedUser(user);
    }
  }
  return processGuest(user);
}

// ✅ Complexidade 3
const USER_PROCESSORS = {
  admin: {
    write: processAdminWrite,
    read: processAdminRead,
    default: processAdminRead
  },
  user: {
    verified: processVerifiedUser,
    unverified: processUnverifiedUser,
    default: (user) => user.verified ? processVerifiedUser(user) : processUnverifiedUser(user)
  },
  default: processGuest
};

function processUser(user, type) {
  const typeProcessors = USER_PROCESSORS[type] || USER_PROCESSORS.default;
  if (typeof typeProcessors === 'function') return typeProcessors(user);
  
  const permission = user.permissions?.[0] || 'default';
  const processor = typeProcessors[permission] || typeProcessors.default;
  return processor(user);
}
```

##### **ESTRATÉGIA 3: PIPELINE PATTERN**
```javascript
// ❌ Complexidade 12+
function processData(input) {
  if (!input) throw new Error('No input');
  if (typeof input !== 'string') throw new Error('Invalid type');
  if (input.length < 5) throw new Error('Too short');
  if (!input.includes('@')) throw new Error('No @');
  
  const cleaned = input.trim().toLowerCase();
  const parts = cleaned.split('@');
  if (parts.length !== 2) throw new Error('Invalid format');
  if (parts[0].length < 3) throw new Error('Username too short');
  if (!parts[1].includes('.')) throw new Error('Invalid domain');
  
  return { username: parts[0], domain: parts[1] };
}

// ✅ Complexidade 2
const VALIDATION_PIPELINE = [
  (input) => input || (() => { throw new Error('No input'); })(),
  (input) => typeof input === 'string' || (() => { throw new Error('Invalid type'); })(),
  (input) => input.length >= 5 || (() => { throw new Error('Too short'); })(),
  (input) => input.includes('@') || (() => { throw new Error('No @'); })()
];

const PROCESSING_PIPELINE = [
  (input) => input.trim().toLowerCase(),
  (input) => input.split('@'),
  (parts) => parts.length === 2 ? parts : (() => { throw new Error('Invalid format'); })(),
  (parts) => parts[0].length >= 3 ? parts : (() => { throw new Error('Username too short'); })(),
  (parts) => parts[1].includes('.') ? parts : (() => { throw new Error('Invalid domain'); })(),
  (parts) => ({ username: parts[0], domain: parts[1] })
];

function processData(input) {
  VALIDATION_PIPELINE.forEach(validator => validator(input));
  return PROCESSING_PIPELINE.reduce((acc, processor) => processor(acc), input);
}
```

#### **🚨 REGRAS DE OURO FINAIS:**

1. **NUNCA assumir que "early returns são simples"** - CADA if + return = +2 pontos
2. **NUNCA criar função auxiliar sem medir sua complexidade primeiro**
3. **SEMPRE somar complexidade total (principal + todas auxiliares)**
4. **SE não conseguir reduzir: PARAR e pedir ajuda**
5. **SEMPRE testar que funcionalidade não quebrou**

#### **🔧 COMPROMISSO DO AGENT:**
```
PROMETO que daqui para frente:
1. ✅ SEMPRE usar este checklist obrigatório
2. ✅ SEMPRE contar manualmente cada operador
3. ✅ SEMPRE verificar TODOS os arquivos (novos e modificados)
4. ✅ SEMPRE testar antes de commit
5. ✅ SE violar: admitir imediatamente e corrigir
6. ✅ NUNCA fazer push se houver novos erros no Codacy
```

---

**🔥 USE ESTE SISTEMA SEMPRE ANTES DE REFATORAR QUALQUER FUNÇÃO! 🔥**

---