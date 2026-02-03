"""
Script de ejemplo para probar el análisis de vulnerabilidades localmente
"""

import sys
import os

# Agregar el directorio actual al path
sys.path.insert(0, os.path.dirname(__file__))

from feature_extraction_ts import extract_features_simple
import joblib
import pandas as pd

def test_analyzer():
    """Prueba el analizador con ejemplos"""
    
    print("="*70)
    print("TEST - PRUEBA DEL ANALIZADOR DE VULNERABILIDADES")
    print("="*70)
    
    # Verificar si existe el modelo
    if not os.path.exists('model.joblib'):
        print("\n[!] No se encontró el modelo entrenado.")
        print("Ejecuta primero: python train_model.py")
        return
    
    # Cargar modelo
    print("\n[*] Cargando modelo...")
    model = joblib.load('model.joblib')
    scaler = joblib.load('scaler.joblib')
    feature_names = joblib.load('feature_names.joblib')
    print("[OK] Modelo cargado correctamente")
    
    # Ejemplos de prueba
    test_cases = [
        {
            'name': 'NoSQL Injection - VULNERABLE',
            'code': """
            router.post('/login', async (req, res) => {
                const { username, password } = req.body;
                const user = await User.findOne({ 
                    username: username, 
                    password: password 
                });
                res.json(user);
            });
            """,
            'expected': 'VULNERABLE'
        },
        {
            'name': 'Con Validación - SEGURO',
            'code': """
            import { body, validationResult } from 'express-validator';
            
            router.post('/login', [
                body('username').isAlphanumeric().trim(),
                body('password').isLength({ min: 8 })
            ], async (req, res) => {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({ errors: errors.array() });
                }
                
                const user = await User.findOne({ username: req.body.username });
                const isValid = await bcrypt.compare(req.body.password, user.password);
                if (isValid) {
                    res.json({ token: generateToken(user) });
                }
            });
            """,
            'expected': 'SEGURO'
        },
        {
            'name': 'Command Injection - VULNERABLE',
            'code': """
            const { exec } = require('child_process');
            
            router.post('/convert', (req, res) => {
                const filename = req.body.filename;
                exec('convert ' + filename + ' output.pdf', (error, stdout) => {
                    if (error) return res.status(500).send(error);
                    res.send('Converted successfully');
                });
            });
            """,
            'expected': 'VULNERABLE'
        },
        {
            'name': 'Sin Ejecución de Comandos - SEGURO',
            'code': """
            import helmet from 'helmet';
            import rateLimit from 'express-rate-limit';
            
            app.use(helmet());
            app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
            
            router.get('/files', async (req, res) => {
                const files = await FileModel.find();
                res.json(files);
            });
            """,
            'expected': 'SEGURO'
        }
    ]
    
    # Probar cada caso
    print("\n" + "="*70)
    print("EJECUTANDO PRUEBAS")
    print("="*70)
    
    correct = 0
    total = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n[Test {i}] {test_case['name']}")
        print("-" * 70)
        
        # Extraer características
        features = extract_features_simple(test_case['code'])
        features_df = pd.DataFrame([features])
        
        # Asegurar columnas correctas
        for col in feature_names:
            if col not in features_df.columns:
                features_df[col] = 0
        features_df = features_df[feature_names]
        
        # Predecir
        features_scaled = scaler.transform(features_df)
        prediction = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]
        
        result = "VULNERABLE" if prediction == 1 else "SEGURO"
        confidence = probabilities[prediction] * 100
        
        # Mostrar resultados
        print(f"Esperado:    {test_case['expected']}")
        print(f"Prediccion:  {result}")
        print(f"Confianza:   {confidence:.2f}%")
        print(f"Prob SEGURO: {probabilities[0]*100:.2f}%")
        print(f"Prob VULN:   {probabilities[1]*100:.2f}%")
        
        # Características clave detectadas
        key_features = []
        if features['exec_calls'] > 0:
            key_features.append(f"exec_calls: {features['exec_calls']}")
        if features['eval_calls'] > 0:
            key_features.append(f"eval_calls: {features['eval_calls']}")
        if features['req_body'] > 0:
            key_features.append(f"req_body: {features['req_body']}")
        if features['has_validator'] > 0:
            key_features.append("validacion presente")
        if features['has_helmet'] > 0:
            key_features.append("helmet presente")
        
        if key_features:
            print(f"Features:    {', '.join(key_features)}")
        
        # Verificar si la predicción es correcta
        if result == test_case['expected']:
            print("[OK] CORRECTO")
            correct += 1
        else:
            print("[ERROR] INCORRECTO")
    
    # Resumen
    print("\n" + "="*70)
    print("RESUMEN DE PRUEBAS")
    print("="*70)
    print(f"Total de pruebas:  {total}")
    print(f"Correctas:         {correct}")
    print(f"Incorrectas:       {total - correct}")
    print(f"Precision:         {(correct/total)*100:.2f}%")
    print("="*70)
    
    if correct == total:
        print("\n[OK] TODAS LAS PRUEBAS PASARON!")
    else:
        print(f"\n[!] {total - correct} prueba(s) fallaron")
    
    print("\n[Tip] Para analizar archivos reales del proyecto:")
    print("   python analyze_pr.py --files ../backend/src/controllers/YourController.ts")


if __name__ == '__main__':
    test_analyzer()
