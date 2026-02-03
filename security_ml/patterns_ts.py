"""
Patrones de vulnerabilidades específicos para Node.js, Express y TypeScript
"""

# Funciones peligrosas de ejecución de comandos
DANGEROUS_EXEC_FUNCTIONS = [
    'exec',
    'execSync',
    'spawn',
    'spawnSync',
    'execFile',
    'execFileSync',
    'fork'
]

# Funciones de evaluación dinámica
DANGEROUS_EVAL_FUNCTIONS = [
    'eval',
    'Function',
    'setTimeout',
    'setInterval',
    'setImmediate'
]

# Operaciones de sistema de archivos
DANGEROUS_FS_FUNCTIONS = [
    'readFile',
    'readFileSync',
    'writeFile',
    'writeFileSync',
    'unlink',
    'unlinkSync',
    'createReadStream',
    'createWriteStream',
    'rmdir',
    'rmdirSync',
    'mkdir',
    'mkdirSync',
    'rename',
    'renameSync'
]

# Operaciones peligrosas de MongoDB/Mongoose
DANGEROUS_DB_OPERATIONS = [
    '$where',
    'findOneAndUpdate',
    'updateMany',
    'deleteMany',
    'aggregate',
    'mapReduce'
]

# Parámetros de entrada del usuario (Express)
USER_INPUT_SOURCES = [
    'req.body',
    'req.query',
    'req.params',
    'req.headers',
    'req.cookies'
]

# Bibliotecas de sanitización y validación
SANITIZATION_LIBRARIES = [
    'express-validator',
    'express-mongo-sanitize',
    'xss-clean',
    'validator',
    'sanitize-html',
    'dompurify',
    'helmet'
]

# Patrones de validación
VALIDATION_PATTERNS = [
    'validate',
    'sanitize',
    'escape',
    'trim',
    'isEmail',
    'isAlphanumeric',
    'isLength',
    'matches',
    'check',
    'body',
    'query',
    'param'
]

# Tipos de vulnerabilidades
VULNERABILITY_TYPES = {
    'nosql_injection': {
        'patterns': ['$where', 'req.body', 'req.query', 'findOneAndUpdate'],
        'description': 'NoSQL Injection - Entrada de usuario sin sanitizar en consultas MongoDB'
    },
    'command_injection': {
        'patterns': ['exec', 'spawn', 'req.body', 'req.query'],
        'description': 'Command Injection - Ejecución de comandos del sistema con entrada de usuario'
    },
    'code_injection': {
        'patterns': ['eval', 'Function', 'req.body', 'req.query'],
        'description': 'Code Injection - Evaluación dinámica de código con entrada de usuario'
    },
    'path_traversal': {
        'patterns': ['readFile', 'writeFile', 'req.params', '../'],
        'description': 'Path Traversal - Acceso a archivos sin validación de ruta'
    },
    'insufficient_validation': {
        'patterns': ['req.body', 'req.query', 'req.params'],
        'description': 'Validación Insuficiente - Uso de entrada de usuario sin validación'
    }
}

# Palabras clave de seguridad (buenas prácticas)
SECURITY_KEYWORDS = [
    'helmet',
    'rateLimit',
    'csrf',
    'sanitize',
    'validate',
    'escape',
    'bcrypt',
    'hash',
    'salt',
    'authenticate',
    'authorize',
    'jwt',
    'verify'
]

# Antipatrones (malas prácticas)
ANTIPATTERNS = [
    'plaintext',
    'hardcoded',
    'TODO: fix security',
    'disable security',
    'trustProxy',
    'process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"'
]
