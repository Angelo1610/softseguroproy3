"""
Extracción de características de archivos TypeScript/JavaScript
para análisis de vulnerabilidades
"""

import re
import os
import json
from typing import Dict, List, Tuple, Any
from pathlib import Path
import esprima
from patterns_ts import (
    DANGEROUS_EXEC_FUNCTIONS,
    DANGEROUS_EVAL_FUNCTIONS,
    DANGEROUS_FS_FUNCTIONS,
    DANGEROUS_DB_OPERATIONS,
    USER_INPUT_SOURCES,
    SANITIZATION_LIBRARIES,
    VALIDATION_PATTERNS,
    SECURITY_KEYWORDS,
    ANTIPATTERNS,
    VULNERABILITY_TYPES
)


class TypeScriptFeatureExtractor:
    """Extrae características de archivos TypeScript/JavaScript para ML"""
    
    def __init__(self):
        self.features = {}
        
    def extract_tokens(self, code: str) -> Dict[str, int]:
        """Extrae y cuenta tokens del código"""
        tokens = {
            'keywords': 0,
            'operators': 0,
            'identifiers': 0,
            'literals': 0,
            'comments': 0
        }
        
        try:
            parsed = esprima.parseScript(code, {'comment': True, 'tokens': True})
            
            if hasattr(parsed, 'tokens'):
                for token in parsed.tokens:
                    token_type = token.type.lower()
                    if 'keyword' in token_type:
                        tokens['keywords'] += 1
                    elif 'punctuator' in token_type or 'operator' in token_type:
                        tokens['operators'] += 1
                    elif 'identifier' in token_type:
                        tokens['identifiers'] += 1
                    elif 'literal' in token_type or 'numeric' in token_type or 'string' in token_type:
                        tokens['literals'] += 1
            
            if hasattr(parsed, 'comments'):
                tokens['comments'] = len(parsed.comments)
                
        except Exception as e:
            print(f"Error al parsear tokens: {e}")
            
        return tokens
    
    def calculate_ast_depth(self, code: str) -> Dict[str, float]:
        """Calcula profundidad del AST"""
        depths = {
            'max_depth': 0,
            'avg_depth': 0,
            'node_count': 0
        }
        
        try:
            ast = esprima.parseScript(code)
            
            def get_depth(node, current_depth=0):
                if not isinstance(node, dict):
                    return current_depth
                
                max_child_depth = current_depth
                for key, value in node.items():
                    if key == 'type':
                        continue
                    if isinstance(value, dict):
                        child_depth = get_depth(value, current_depth + 1)
                        max_child_depth = max(max_child_depth, child_depth)
                    elif isinstance(value, list):
                        for item in value:
                            if isinstance(item, dict):
                                child_depth = get_depth(item, current_depth + 1)
                                max_child_depth = max(max_child_depth, child_depth)
                
                return max_child_depth
            
            depths['max_depth'] = get_depth(ast.toDict() if hasattr(ast, 'toDict') else ast)
            depths['node_count'] = self._count_nodes(ast.toDict() if hasattr(ast, 'toDict') else ast)
            depths['avg_depth'] = depths['max_depth'] / max(depths['node_count'], 1)
            
        except Exception as e:
            print(f"Error al calcular AST: {e}")
            
        return depths
    
    def _count_nodes(self, node) -> int:
        """Cuenta nodos en el AST"""
        if not isinstance(node, dict):
            return 0
        
        count = 1
        for key, value in node.items():
            if key == 'type':
                continue
            if isinstance(value, dict):
                count += self._count_nodes(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        count += self._count_nodes(item)
        
        return count
    
    def detect_dangerous_calls(self, code: str) -> Dict[str, int]:
        """Detecta llamadas a funciones peligrosas"""
        dangerous_calls = {
            'exec_calls': 0,
            'eval_calls': 0,
            'fs_calls': 0,
            'db_dangerous': 0,
            'user_input_usage': 0
        }
        
        # Ejecutar comando
        for func in DANGEROUS_EXEC_FUNCTIONS:
            dangerous_calls['exec_calls'] += len(re.findall(rf'\b{func}\s*\(', code))
        
        # Evaluación dinámica
        for func in DANGEROUS_EVAL_FUNCTIONS:
            dangerous_calls['eval_calls'] += len(re.findall(rf'\b{func}\s*\(', code))
        
        # Sistema de archivos
        for func in DANGEROUS_FS_FUNCTIONS:
            dangerous_calls['fs_calls'] += len(re.findall(rf'\b{func}\s*\(', code))
        
        # Operaciones peligrosas de BD
        for op in DANGEROUS_DB_OPERATIONS:
            dangerous_calls['db_dangerous'] += len(re.findall(rf'{re.escape(op)}', code))
        
        # Uso de entrada de usuario
        for source in USER_INPUT_SOURCES:
            dangerous_calls['user_input_usage'] += len(re.findall(rf'{re.escape(source)}', code))
        
        return dangerous_calls
    
    def detect_sanitization(self, code: str) -> Dict[str, int]:
        """Detecta presencia de sanitización y validación"""
        sanitization = {
            'has_validation': 0,
            'sanitization_libs': 0,
            'validation_calls': 0,
            'security_middleware': 0
        }
        
        # Librerías de sanitización
        for lib in SANITIZATION_LIBRARIES:
            if re.search(rf'(?:import|require).*{re.escape(lib)}', code):
                sanitization['sanitization_libs'] += 1
                sanitization['has_validation'] = 1
        
        # Patrones de validación
        for pattern in VALIDATION_PATTERNS:
            sanitization['validation_calls'] += len(re.findall(rf'\b{pattern}\s*\(', code))
        
        # Middleware de seguridad
        if re.search(r'helmet\s*\(', code):
            sanitization['security_middleware'] += 1
        if re.search(r'rateLimit\s*\(', code):
            sanitization['security_middleware'] += 1
        
        return sanitization
    
    def detect_security_practices(self, code: str) -> Dict[str, int]:
        """Detecta prácticas de seguridad y antipatrones"""
        practices = {
            'security_keywords': 0,
            'antipatterns': 0,
            'authentication': 0,
            'encryption': 0
        }
        
        # Palabras clave de seguridad
        for keyword in SECURITY_KEYWORDS:
            practices['security_keywords'] += len(re.findall(rf'\b{keyword}\b', code, re.IGNORECASE))
        
        # Antipatrones
        for antipattern in ANTIPATTERNS:
            if antipattern in code.lower():
                practices['antipatterns'] += 1
        
        # Autenticación
        if re.search(r'authenticate|authorization|jwt|token', code, re.IGNORECASE):
            practices['authentication'] = 1
        
        # Encriptación
        if re.search(r'bcrypt|crypto|hash|encrypt', code, re.IGNORECASE):
            practices['encryption'] = 1
        
        return practices
    
    def detect_vulnerability_type(self, code: str, features: Dict) -> List[Tuple[str, float]]:
        """Identifica tipos de vulnerabilidades potenciales"""
        vulnerabilities = []
        
        for vuln_type, vuln_info in VULNERABILITY_TYPES.items():
            score = 0
            pattern_matches = 0
            
            for pattern in vuln_info['patterns']:
                if re.search(rf'\b{re.escape(pattern)}\b', code):
                    pattern_matches += 1
            
            # Calcular score basado en patrones y características
            if pattern_matches >= 2:
                score = pattern_matches / len(vuln_info['patterns'])
                
                # Ajustar score basado en sanitización
                if features.get('has_validation', 0) > 0:
                    score *= 0.5
                
                vulnerabilities.append((vuln_type, score))
        
        # Ordenar por score descendente
        vulnerabilities.sort(key=lambda x: x[1], reverse=True)
        
        return vulnerabilities
    
    def extract_all_features(self, code: str, file_path: str = "") -> Dict[str, Any]:
        """Extrae todas las características de un archivo"""
        features = {
            'file_path': file_path,
            'file_size': len(code),
            'lines_of_code': len(code.split('\n'))
        }
        
        # Tokens
        tokens = self.extract_tokens(code)
        features.update(tokens)
        
        # AST
        ast_metrics = self.calculate_ast_depth(code)
        features.update(ast_metrics)
        
        # Llamadas peligrosas
        dangerous = self.detect_dangerous_calls(code)
        features.update(dangerous)
        
        # Sanitización
        sanitization = self.detect_sanitization(code)
        features.update(sanitization)
        
        # Prácticas de seguridad
        practices = self.detect_security_practices(code)
        features.update(practices)
        
        # Detectar tipos de vulnerabilidad
        vulnerabilities = self.detect_vulnerability_type(code, features)
        features['potential_vulnerabilities'] = vulnerabilities
        
        # Score de riesgo general
        risk_score = self._calculate_risk_score(features)
        features['risk_score'] = risk_score
        
        return features
    
    def _calculate_risk_score(self, features: Dict) -> float:
        """Calcula un score de riesgo general (0-1)"""
        score = 0.0
        
        # Factores que aumentan el riesgo
        score += features.get('exec_calls', 0) * 0.15
        score += features.get('eval_calls', 0) * 0.15
        score += features.get('db_dangerous', 0) * 0.10
        score += features.get('user_input_usage', 0) * 0.05
        score += features.get('antipatterns', 0) * 0.10
        
        # Factores que reducen el riesgo
        score -= features.get('has_validation', 0) * 0.20
        score -= features.get('sanitization_libs', 0) * 0.10
        score -= features.get('security_middleware', 0) * 0.05
        score -= features.get('authentication', 0) * 0.05
        
        # Normalizar entre 0 y 1
        score = max(0.0, min(1.0, score))
        
        return score
    
    def extract_features_from_file(self, file_path: str) -> Dict[str, Any]:
        """Extrae características de un archivo específico"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
            return self.extract_all_features(code, file_path)
        except Exception as e:
            print(f"Error al leer archivo {file_path}: {e}")
            return {}
    
    def extract_features_from_directory(self, directory: str, extensions: List[str] = ['.ts', '.js']) -> List[Dict[str, Any]]:
        """Extrae características de todos los archivos en un directorio"""
        features_list = []
        
        for root, dirs, files in os.walk(directory):
            # Ignorar node_modules y dist
            dirs[:] = [d for d in dirs if d not in ['node_modules', 'dist', 'build', '.git']]
            
            for file in files:
                if any(file.endswith(ext) for ext in extensions):
                    file_path = os.path.join(root, file)
                    features = self.extract_features_from_file(file_path)
                    if features:
                        features_list.append(features)
        
        return features_list


def extract_features_simple(code: str) -> Dict[str, float]:
    """Extracción simplificada de características para uso directo"""
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


def main():
    """Ejemplo de uso"""
    extractor = TypeScriptFeatureExtractor()
    
    # Código de ejemplo vulnerable
    vulnerable_code = """
    import express from 'express';
    const router = express.Router();
    
    router.post('/search', async (req, res) => {
        const { username } = req.body;
        const user = await User.findOne({ username: username });
        res.json(user);
    });
    """
    
    features = extractor.extract_all_features(vulnerable_code)
    print("Características extraídas:")
    print(json.dumps(features, indent=2, default=str))


if __name__ == '__main__':
    main()
