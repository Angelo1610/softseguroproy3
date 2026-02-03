"""
Script simplificado para entrenar el modelo de ML
Ejecuta las mismas operaciones que el notebook
"""

import warnings
warnings.filterwarnings('ignore')

import os
import json
import re
from pathlib import Path
from typing import Dict

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from xgboost import XGBClassifier
import joblib

print("="*70)
print("🚀 ENTRENAMIENTO DEL MODELO DE DETECCIÓN DE VULNERABILIDADES")
print("="*70)

# Función de extracción de características
def extract_features_simple(code: str) -> Dict[str, float]:
    """Extracción simplificada de características"""
    features = {}
    
    features['num_lines'] = len(code.split('\n'))
    features['code_length'] = len(code)
    features['num_imports'] = len(re.findall(r'\b(?:import|require)\b', code))
    
    features['exec_calls'] = len(re.findall(r'\bexec(?:Sync)?\s*\(', code))
    features['spawn_calls'] = len(re.findall(r'\bspawn(?:Sync)?\s*\(', code))
    features['eval_calls'] = len(re.findall(r'\beval\s*\(', code))
    features['function_constructor'] = len(re.findall(r'\bnew\s+Function\s*\(', code))
    
    features['fs_read'] = len(re.findall(r'\breadFile(?:Sync)?\s*\(', code))
    features['fs_write'] = len(re.findall(r'\bwriteFile(?:Sync)?\s*\(', code))
    features['fs_unlink'] = len(re.findall(r'\bunlink(?:Sync)?\s*\(', code))
    
    features['db_where'] = len(re.findall(r'\$where', code))
    features['db_update_many'] = len(re.findall(r'\bupdateMany\s*\(', code))
    features['db_delete_many'] = len(re.findall(r'\bdeleteMany\s*\(', code))
    
    features['req_body'] = len(re.findall(r'req\.body', code))
    features['req_query'] = len(re.findall(r'req\.query', code))
    features['req_params'] = len(re.findall(r'req\.params', code))
    
    features['has_validator'] = 1 if re.search(r'express-validator|validationResult', code) else 0
    features['has_sanitize'] = 1 if re.search(r'sanitize|xss-clean|mongo-sanitize', code) else 0
    features['validation_calls'] = len(re.findall(r'\b(?:body|query|param|check)\s*\(', code))
    features['trim_calls'] = len(re.findall(r'\.trim\s*\(', code))
    features['escape_calls'] = len(re.findall(r'\.escape\s*\(', code))
    
    features['has_helmet'] = 1 if re.search(r'helmet', code) else 0
    features['has_rate_limit'] = 1 if re.search(r'rateLimit', code) else 0
    features['has_bcrypt'] = 1 if re.search(r'bcrypt', code) else 0
    features['has_jwt'] = 1 if re.search(r'\bjwt\b', code) else 0
    features['has_auth_middleware'] = 1 if re.search(r'authenticate|authorize', code) else 0
    
    features['has_hardcoded'] = 1 if re.search(r'hardcoded|TODO.*security', code, re.IGNORECASE) else 0
    
    features['num_functions'] = len(re.findall(r'\bfunction\b|=>\s*{|async\s+\(', code))
    features['num_conditionals'] = len(re.findall(r'\bif\s*\(', code))
    
    return features

# Dataset sintético
print("\n📊 Creando dataset sintético...")

vulnerable_samples = [
    "router.post('/login', async (req, res) => { const user = await User.findOne({ username: req.body.username, password: req.body.password }); res.json(user); });",
    "app.get('/search', async (req, res) => { const query = { name: req.query.name }; const results = await Collection.find(query); res.json(results); });",
    "const { exec } = require('child_process'); router.post('/run', (req, res) => { exec('ls ' + req.body.directory, (error, stdout) => { res.send(stdout); }); });",
    "import { spawn } from 'child_process'; app.post('/convert', (req, res) => { const file = req.query.file; const child = spawn('convert', [file]); });",
    "router.post('/calculate', (req, res) => { const result = eval(req.body.expression); res.json({ result }); });",
    "app.get('/execute', (req, res) => { const func = new Function(req.query.code); func(); });",
    "import fs from 'fs'; router.get('/file', (req, res) => { const content = fs.readFileSync(req.params.filename); res.send(content); });",
    "app.post('/upload', (req, res) => { fs.writeFileSync('./uploads/' + req.body.filename, req.body.data); });",
    "router.post('/update', async (req, res) => { await User.updateOne({ _id: req.params.id }, req.body); });",
    "app.delete('/remove', async (req, res) => { await Product.deleteMany({ category: req.query.category }); });",
]

secure_samples = [
    "import { body, validationResult } from 'express-validator'; router.post('/login', [body('username').isAlphanumeric().trim(), body('password').isLength({ min: 8 })], async (req, res) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); });",
    "import xss from 'xss-clean'; import mongoSanitize from 'express-mongo-sanitize'; app.use(xss()); app.use(mongoSanitize()); router.get('/search', [query('name').trim().escape()], async (req, res) => { const results = await Collection.find({ name: req.query.name }); res.json(results); });",
    "import path from 'path'; import { promisify } from 'util'; router.get('/files', async (req, res) => { const files = await fs.readdir('./public'); res.json(files); });",
    "import path from 'path'; router.get('/download', [param('filename').matches(/^[a-zA-Z0-9_.-]+$/)], (req, res) => { const safePath = path.join(__dirname, 'files', path.basename(req.params.filename)); if (!safePath.startsWith(__dirname)) return res.status(403).send('Forbidden'); });",
    "import jwt from 'jsonwebtoken'; import { authenticate, authorize } from './middleware'; router.put('/users/:id', [authenticate, authorize(['admin']), body('email').isEmail()], async (req, res) => { const user = await User.findByIdAndUpdate(req.params.id, { email: req.body.email }); res.json(user); });",
    "import helmet from 'helmet'; import rateLimit from 'express-rate-limit'; app.use(helmet()); const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }); app.use(limiter);",
]

dataset = []
for code in vulnerable_samples:
    dataset.append({'code': code, 'label': 'VULNERABLE'})
for code in secure_samples:
    dataset.append({'code': code, 'label': 'SEGURO'})

df = pd.DataFrame(dataset)
print(f"✅ Dataset creado: {len(df)} ejemplos")
print(f"   Vulnerables: {len(df[df['label'] == 'VULNERABLE'])}")
print(f"   Seguros: {len(df[df['label'] == 'SEGURO'])}")

# Extraer características
print("\n🔍 Extrayendo características...")
features_list = []
labels = []

for _, row in df.iterrows():
    features = extract_features_simple(row['code'])
    features_list.append(features)
    labels.append(1 if row['label'] == 'VULNERABLE' else 0)

features_df = pd.DataFrame(features_list)
features_df['label'] = labels

print(f"✅ {features_df.shape[1] - 1} características extraídas")

# Preparar datos
print("\n📦 Preparando datos...")
X = features_df.drop('label', axis=1)
y = features_df['label']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print(f"✅ Datos preparados: {X_train.shape[0]} train, {X_test.shape[0]} test")

# Entrenar modelos
print("\n🤖 Entrenando modelos...")
models = {
    'Random Forest': RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, class_weight='balanced'),
    'XGBoost': XGBClassifier(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, eval_metric='logloss')
}

results = {}
for name, model in models.items():
    print(f"\n  📊 {name}...")
    model.fit(X_train_scaled, y_train)
    y_pred = model.predict(X_test_scaled)
    
    f1 = f1_score(y_test, y_pred, zero_division=0)
    acc = accuracy_score(y_test, y_pred)
    
    results[name] = {'f1': f1, 'accuracy': acc, 'model': model}
    print(f"     F1-Score: {f1:.4f}")
    print(f"     Accuracy: {acc:.4f}")

# Seleccionar mejor modelo
best_model_name = max(results, key=lambda x: results[x]['f1'])
best_model = results[best_model_name]['model']

print(f"\n🏆 Mejor modelo: {best_model_name}")
print(f"   F1-Score: {results[best_model_name]['f1']:.4f}")

# Exportar
print("\n💾 Exportando modelo...")
joblib.dump(best_model, 'model.joblib')
joblib.dump(scaler, 'scaler.joblib')
joblib.dump(list(X.columns), 'feature_names.joblib')

metadata = {
    'model_name': best_model_name,
    'f1_score': float(results[best_model_name]['f1']),
    'accuracy': float(results[best_model_name]['accuracy']),
    'num_features': int(X.shape[1]),
    'feature_names': list(X.columns)
}

with open('model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("✅ Modelo exportado:")
print("   📁 model.joblib")
print("   📁 scaler.joblib")
print("   📁 feature_names.joblib")
print("   📁 model_metadata.json")

print("\n" + "="*70)
print("✅ ENTRENAMIENTO COMPLETADO EXITOSAMENTE")
print("="*70)
