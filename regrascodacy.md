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
    
    const