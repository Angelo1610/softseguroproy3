"""
Script para analizar Pull Requests y detectar vulnerabilidades usando ML
Ejecutado automáticamente por GitHub Actions
"""

import os
import sys
import json
import argparse
from typing import List, Dict, Any
from pathlib import Path
import joblib
import pandas as pd
import re
from github import Github
import requests

# Importar extractor de características
def extract_features_simple(code: str) -> Dict[str, float]:
    """Extracción simplificada de características"""
    features = {}
    
    # Conteo de tokens básicos
    features['num_lines'] = len(code.split('\n'))
    features['code_length'] = len(code)
    features['num_imports'] = len(re.findall(r'\b(?:import|require)\b', code))
    
    # Llamadas peligrosas
    features['exec_calls'] = len(re.findall(r'\bexec(?:Sync)?\s*\(', code))
    features['spawn_calls'] = len(re.findall(r'\bspawn(?:Sync)?\s*\(', code))
    features['eval_calls'] = len(re.findall(r'\beval\s*\(', code))
    features['function_constructor'] = len(re.findall(r'\bnew\s+Function\s*\(', code))
    
    # Operaciones de sistema de archivos
    features['fs_read'] = len(re.findall(r'\breadFile(?:Sync)?\s*\(', code))
    features['fs_write'] = len(re.findall(r'\bwriteFile(?:Sync)?\s*\(', code))
    features['fs_unlink'] = len(re.findall(r'\bunlink(?:Sync)?\s*\(', code))
    
    # Operaciones peligrosas de BD
    features['db_where'] = len(re.findall(r'\$where', code))
    features['db_update_many'] = len(re.findall(r'\bupdateMany\s*\(', code))
    features['db_delete_many'] = len(re.findall(r'\bdeleteMany\s*\(', code))
    
    # Uso de entrada de usuario
    features['req_body'] = len(re.findall(r'req\.body', code))
    features['req_query'] = len(re.findall(r'req\.query', code))
    features['req_params'] = len(re.findall(r'req\.params', code))
    
    # Sanitización y validación
    features['has_validator'] = 1 if re.search(r'express-validator|validationResult', code) else 0
    features['has_sanitize'] = 1 if re.search(r'sanitize|xss-clean|mongo-sanitize', code) else 0
    features['validation_calls'] = len(re.findall(r'\b(?:body|query|param|check)\s*\(', code))
    features['trim_calls'] = len(re.findall(r'\.trim\s*\(', code))
    features['escape_calls'] = len(re.findall(r'\.escape\s*\(', code))
    
    # Seguridad
    features['has_helmet'] = 1 if re.search(r'helmet', code) else 0
    features['has_rate_limit'] = 1 if re.search(r'rateLimit', code) else 0
    features['has_bcrypt'] = 1 if re.search(r'bcrypt', code) else 0
    features['has_jwt'] = 1 if re.search(r'\bjwt\b', code) else 0
    features['has_auth_middleware'] = 1 if re.search(r'authenticate|authorize', code) else 0
    
    # Antipatrones
    features['has_hardcoded'] = 1 if re.search(r'hardcoded|TODO.*security', code, re.IGNORECASE) else 0
    
    # Complejidad aproximada
    features['num_functions'] = len(re.findall(r'\bfunction\b|=>\s*{|async\s+\(', code))
    features['num_conditionals'] = len(re.findall(r'\bif\s*\(', code))
    
    return features


class VulnerabilityAnalyzer:
    """Analiza archivos en busca de vulnerabilidades usando el modelo ML"""
    
    def __init__(self, model_path: str = 'model.joblib', 
                 scaler_path: str = 'scaler.joblib',
                 feature_names_path: str = 'feature_names.joblib'):
        """Inicializa el analizador cargando el modelo entrenado"""
        try:
            self.model = joblib.load(model_path)
            self.scaler = joblib.load(scaler_path)
            self.feature_names = joblib.load(feature_names_path)
            print(f"✅ Modelo cargado: {model_path}")
        except Exception as e:
            print(f"❌ Error al cargar el modelo: {e}")
            raise
    
    def analyze_file(self, file_path: str, code: str = None) -> Dict[str, Any]:
        """Analiza un archivo y determina si es vulnerable"""
        
        # Leer código si no se proporciona
        if code is None:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
        
        # Extraer características
        features = extract_features_simple(code)
        
        # REGLA HEURÍSTICA: Detectar patrones críticos automáticamente
        # Si hay uso de funciones peligrosas CON entrada del usuario sin validación -> VULNERABLE
        critical_vulnerability = False
        critical_reason = ""
        
        if features['exec_calls'] > 0 and features['req_body'] > 0 and features['validation_calls'] == 0:
            critical_vulnerability = True
            critical_reason = "Command Injection: exec() con req.body sin validación"
        elif features['eval_calls'] > 0 and (features['req_body'] > 0 or features['req_query'] > 0) and features['validation_calls'] == 0:
            critical_vulnerability = True
            critical_reason = "Code Injection: eval() con entrada de usuario sin validación"
        elif (features['exec_calls'] > 0 or features['spawn_calls'] > 0) and features['validation_calls'] == 0:
            critical_vulnerability = True
            critical_reason = "Command Injection: ejecución de comandos sin validación"
        elif features['db_where'] > 0:
            critical_vulnerability = True
            critical_reason = "NoSQL Injection: uso de $where en MongoDB"
        elif (features['req_body'] > 2 or features['req_query'] > 1) and features['validation_calls'] == 0 and features['has_sanitize'] == 0:
            # Uso extensivo de entrada del usuario sin ninguna protección
            critical_vulnerability = True
            critical_reason = "Validación Insuficiente: múltiples usos de req.body/req.query sin validación ni sanitización"
        
        # Si se detectó vulnerabilidad crítica, marcar como VULNERABLE directamente
        if critical_vulnerability:
            result = "VULNERABLE"
            confidence = 95.0  # Alta confianza en reglas heurísticas
            probabilities = [0.05, 0.95]  # [SEGURO, VULNERABLE]
            vulnerability_type = critical_reason.split(':')[0]
        else:
            # Convertir a DataFrame
            features_df = pd.DataFrame([features])
            
            # Asegurar que tenemos todas las columnas
            for col in self.feature_names:
                if col not in features_df.columns:
                    features_df[col] = 0
            
            features_df = features_df[self.feature_names]
            
            # Escalar
            features_scaled = self.scaler.transform(features_df)
            
            # Predecir
            prediction = self.model.predict(features_scaled)[0]
            probabilities = self.model.predict_proba(features_scaled)[0]
            
            result = "VULNERABLE" if prediction == 1 else "SEGURO"
            confidence = probabilities[prediction] * 100
            vulnerability_type = self._detect_vulnerability_type(features, prediction)
        
        # Detectar patrones específicos
        patterns_detected = self._detect_patterns(code, features)
        
        return {
            'file': file_path,
            'result': result,
            'confidence': confidence,
            'vulnerability_type': vulnerability_type,
            'patterns': patterns_detected,
            'probabilities': {
                'SEGURO': probabilities[0] * 100,
                'VULNERABLE': probabilities[1] * 100
            },
            'features': features
        }
    
    def _detect_vulnerability_type(self, features: Dict, prediction: int) -> str:
        """Detecta el tipo específico de vulnerabilidad"""
        if prediction == 0:
            return "N/A"
        
        if features['db_where'] > 0 or (features['req_body'] > 0 and features['db_update_many'] > 0):
            return "NoSQL Injection"
        elif features['exec_calls'] > 0 or features['spawn_calls'] > 0:
            return "Command Injection"
        elif features['eval_calls'] > 0 or features['function_constructor'] > 0:
            return "Code Injection"
        elif (features['fs_read'] > 0 or features['fs_write'] > 0) and features['req_params'] > 0:
            return "Path Traversal"
        elif (features['req_body'] > 0 or features['req_query'] > 0) and features['validation_calls'] == 0:
            return "Validación Insuficiente de Entradas"
        else:
            return "Vulnerabilidad Genérica"
    
    def _detect_patterns(self, code: str, features: Dict) -> List[str]:
        """Detecta patrones específicos de vulnerabilidad"""
        patterns = []
        
        if features['exec_calls'] > 0:
            patterns.append("Ejecución de comandos del sistema (exec)")
        if features['spawn_calls'] > 0:
            patterns.append("Ejecución de comandos del sistema (spawn)")
        if features['eval_calls'] > 0:
            patterns.append("Evaluación dinámica de código (eval)")
        if features['db_where'] > 0:
            patterns.append("Uso de $where en MongoDB")
        if features['req_body'] > 0 and features['validation_calls'] == 0:
            patterns.append("Uso de req.body sin validación")
        if features['req_query'] > 0 and features['validation_calls'] == 0:
            patterns.append("Uso de req.query sin validación")
        if features['fs_read'] > 0 or features['fs_write'] > 0:
            patterns.append("Operaciones de sistema de archivos")
        if features['has_hardcoded'] > 0:
            patterns.append("Posible credencial hardcoded")
        
        return patterns
    
    def analyze_pr_files(self, files: List[str]) -> Dict[str, Any]:
        """Analiza todos los archivos modificados en un PR"""
        results = {
            'total_files': 0,
            'vulnerable_files': 0,
            'secure_files': 0,
            'files_analyzed': [],
            'overall_status': 'SEGURO'
        }
        
        for file_path in files:
            # Solo analizar archivos .ts y .js del backend
            if not (file_path.endswith('.ts') or file_path.endswith('.js')):
                continue
            
            if not any(component in file_path for component in 
                      ['controller', 'route', 'middleware', 'service', 'repository', 'adapter']):
                continue
            
            if not os.path.exists(file_path):
                print(f"⚠️  Archivo no encontrado: {file_path}")
                continue
            
            print(f"🔍 Analizando: {file_path}")
            
            try:
                analysis = self.analyze_file(file_path)
                results['files_analyzed'].append(analysis)
                results['total_files'] += 1
                
                if analysis['result'] == 'VULNERABLE':
                    results['vulnerable_files'] += 1
                    results['overall_status'] = 'VULNERABLE'
                else:
                    results['secure_files'] += 1
                    
            except Exception as e:
                print(f"❌ Error al analizar {file_path}: {e}")
        
        return results


def create_pr_comment(results: Dict[str, Any]) -> str:
    """Crea el comentario para el PR basado en los resultados"""
    
    if results['overall_status'] == 'SEGURO':
        comment = "## ✅ Análisis de Seguridad - APROBADO\n\n"
        comment += f"**Resultado**: ✅ Código SEGURO\n\n"
        comment += f"Se analizaron **{results['total_files']}** archivos y no se detectaron vulnerabilidades.\n\n"
    else:
        comment = "## ⚠️ Análisis de Seguridad - VULNERABILIDADES DETECTADAS\n\n"
        comment += f"**Resultado**: ❌ Código VULNERABLE\n\n"
        comment += f"**Archivos analizados**: {results['total_files']}\n"
        comment += f"**Archivos vulnerables**: {results['vulnerable_files']}\n"
        comment += f"**Archivos seguros**: {results['secure_files']}\n\n"
        
        comment += "### 🔴 Vulnerabilidades Encontradas:\n\n"
        
        for file_analysis in results['files_analyzed']:
            if file_analysis['result'] == 'VULNERABLE':
                comment += f"#### 📄 `{file_analysis['file']}`\n\n"
                comment += f"- **Tipo**: {file_analysis['vulnerability_type']}\n"
                comment += f"- **Confianza**: {file_analysis['confidence']:.2f}%\n"
                comment += f"- **Probabilidad de vulnerabilidad**: {file_analysis['probabilities']['VULNERABLE']:.2f}%\n\n"
                
                if file_analysis['patterns']:
                    comment += "**Patrones detectados**:\n"
                    for pattern in file_analysis['patterns']:
                        comment += f"- ⚠️  {pattern}\n"
                    comment += "\n"
    
    comment += "\n---\n"
    comment += "*Análisis realizado automáticamente por el sistema de ML de detección de vulnerabilidades*\n"
    
    return comment


def send_telegram_notification(message: str, telegram_token: str, chat_id: str):
    """Envía notificación por Telegram"""
    try:
        url = f"https://api.telegram.org/bot{telegram_token}/sendMessage"
        data = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'Markdown'
        }
        response = requests.post(url, data=data)
        if response.status_code == 200:
            print("✅ Notificación de Telegram enviada")
        else:
            print(f"⚠️  Error al enviar Telegram: {response.text}")
    except Exception as e:
        print(f"❌ Error en Telegram: {e}")


def main():
    parser = argparse.ArgumentParser(description='Analizar PR en busca de vulnerabilidades')
    parser.add_argument('--pr-number', type=int, help='Número del PR')
    parser.add_argument('--files', nargs='+', help='Archivos a analizar')
    parser.add_argument('--repo', help='Repositorio (owner/repo)')
    parser.add_argument('--github-token', help='GitHub token')
    parser.add_argument('--telegram-token', help='Telegram bot token')
    parser.add_argument('--telegram-chat-id', help='Telegram chat ID')
    
    args = parser.parse_args()
    
    # Inicializar analizador
    print("🚀 Iniciando análisis de vulnerabilidades...")
    analyzer = VulnerabilityAnalyzer()
    
    # Analizar archivos
    files_to_analyze = args.files or []
    results = analyzer.analyze_pr_files(files_to_analyze)
    
    print("\n" + "="*70)
    print("📊 RESULTADOS DEL ANÁLISIS")
    print("="*70)
    print(f"Estado general: {results['overall_status']}")
    print(f"Archivos analizados: {results['total_files']}")
    print(f"Archivos vulnerables: {results['vulnerable_files']}")
    print(f"Archivos seguros: {results['secure_files']}")
    print("="*70)
    
    # Crear comentario para PR
    pr_comment = create_pr_comment(results)
    print("\n📝 Comentario para PR:")
    print(pr_comment)
    
    # Publicar en GitHub si hay token y PR
    if args.github_token and args.pr_number and args.repo:
        try:
            g = Github(args.github_token)
            repo = g.get_repo(args.repo)
            pr = repo.get_pull(args.pr_number)
            
            # Publicar comentario
            pr.create_issue_comment(pr_comment)
            print("✅ Comentario publicado en el PR")
            
            # Agregar etiqueta si es vulnerable
            if results['overall_status'] == 'VULNERABLE':
                try:
                    pr.add_to_labels('security-vulnerability')
                    print("✅ Etiqueta 'security-vulnerability' agregada")
                except:
                    print("⚠️  No se pudo agregar etiqueta")
                
                # Crear issue
                try:
                    issue_title = f"🔴 Vulnerabilidad detectada en PR #{args.pr_number}"
                    issue_body = f"Se detectaron vulnerabilidades en el PR #{args.pr_number}\n\n{pr_comment}"
                    repo.create_issue(title=issue_title, body=issue_body, labels=['security-vulnerability'])
                    print("✅ Issue de seguridad creada")
                except Exception as e:
                    print(f"⚠️  No se pudo crear issue: {e}")
            
        except Exception as e:
            print(f"❌ Error al interactuar con GitHub: {e}")
    
    # Enviar notificación por Telegram
    if args.telegram_token and args.telegram_chat_id and results['overall_status'] == 'VULNERABLE':
        telegram_message = f"🚨 *VULNERABILIDAD DETECTADA*\n\n"
        telegram_message += f"PR #{args.pr_number}\n"
        telegram_message += f"Archivos vulnerables: {results['vulnerable_files']}\n\n"
        telegram_message += "Revisa el PR para más detalles."
        
        send_telegram_notification(telegram_message, args.telegram_token, args.telegram_chat_id)
    
    # Salir con código de error si hay vulnerabilidades
    if results['overall_status'] == 'VULNERABLE':
        print("\n❌ ANÁLISIS FALLIDO: Se detectaron vulnerabilidades")
        sys.exit(1)
    else:
        print("\n✅ ANÁLISIS EXITOSO: No se detectaron vulnerabilidades")
        sys.exit(0)


if __name__ == '__main__':
    main()
