#!/usr/bin/env node

/**
 * AI Security Scanner
 * Analiza el código en busca de vulnerabilidades usando patrones de IA
 * 
 * En producción, integrar con:
 * - OpenAI GPT-4 para análisis de código
 * - Claude para detección de patrones inseguros
 * - Snyk, SonarQube, etc.
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 AI Security Scanner - Iniciando análisis...\n');

// Patrones de vulnerabilidades comunes
const vulnerabilityPatterns = [
  {
    name: 'Hardcoded Secrets',
    pattern: /(password|secret|key|token)\s*=\s*['"]\w+['"]/gi,
    severity: 'HIGH',
    description: 'Secretos hardcoded detectados',
  },
  {
    name: 'SQL Injection Risk',
    pattern: /query\s*=.*\+.*req\.(body|query|params)/gi,
    severity: 'CRITICAL',
    description: 'Posible vulnerabilidad de inyección SQL',
  },
  {
    name: 'Eval Usage',
    pattern: /eval\(/gi,
    severity: 'CRITICAL',
    description: 'Uso de eval() detectado',
  },
  {
    name: 'Console.log in Production',
    pattern: /console\.(log|debug|info)/gi,
    severity: 'LOW',
    description: 'Console.log detectado - puede exponer información sensible',
  },
  {
    name: 'Weak Crypto',
    pattern: /md5|sha1/gi,
    severity: 'MEDIUM',
    description: 'Algoritmo criptográfico débil',
  },
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const findings = [];

  vulnerabilityPatterns.forEach((pattern) => {
    const matches = content.match(pattern.pattern);
    if (matches) {
      findings.push({
        file: filePath,
        vulnerability: pattern.name,
        severity: pattern.severity,
        description: pattern.description,
        occurrences: matches.length,
      });
    }
  });

  return findings;
}

function scanDirectory(dir, findings = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
        scanDirectory(filePath, findings);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const fileFindings = scanFile(filePath);
      findings.push(...fileFindings);
    }
  });

  return findings;
}

// Ejecutar escaneo
const srcPath = path.join(__dirname, '..', 'src');
const findings = scanDirectory(srcPath);

// Generar reporte
console.log('📊 Resultados del Análisis de Seguridad\n');
console.log('=' .repeat(60));

if (findings.length === 0) {
  console.log('✅ No se encontraron vulnerabilidades conocidas');
} else {
  const critical = findings.filter((f) => f.severity === 'CRITICAL');
  const high = findings.filter((f) => f.severity === 'HIGH');
  const medium = findings.filter((f) => f.severity === 'MEDIUM');
  const low = findings.filter((f) => f.severity === 'LOW');

  console.log(`Total de hallazgos: ${findings.length}\n`);
  console.log(`🔴 CRÍTICO: ${critical.length}`);
  console.log(`🟠 ALTO: ${high.length}`);
  console.log(`🟡 MEDIO: ${medium.length}`);
  console.log(`🟢 BAJO: ${low.length}\n`);

  console.log('Detalles:\n');

  findings.forEach((finding, index) => {
    console.log(`${index + 1}. [${finding.severity}] ${finding.vulnerability}`);
    console.log(`   Archivo: ${finding.file}`);
    console.log(`   ${finding.description}`);
    console.log(`   Ocurrencias: ${finding.occurrences}\n`);
  });
}

console.log('=' .repeat(60));
console.log('\n💡 Recomendaciones:');
console.log('- Revisar y corregir las vulnerabilidades detectadas');
console.log('- Usar variables de entorno para secretos');
console.log('- Implementar análisis estático continuo en CI/CD');
console.log('- Considerar integración con herramientas profesionales (Snyk, SonarQube)');

// Salir con código de error si hay vulnerabilidades críticas
if (findings.some((f) => f.severity === 'CRITICAL')) {
  process.exit(1);
}
