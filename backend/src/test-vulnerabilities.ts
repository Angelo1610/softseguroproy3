// 🧪 ARCHIVO DE PRUEBA - GitHub Actions ML Security Scanner
// Este archivo contiene vulnerabilidades intencionales para testing

import { Request, Response } from 'express';

export class VulnerableTestController {
  // ❌ VULNERABILIDAD 1: SQL Injection
  async getUserData(req: Request, res: Response) {
    const userId = req.params.id;
    const query = `SELECT * FROM users WHERE id = '${userId}'`; // SQL directo
    console.log('Ejecutando:', query);
    return res.json({ query });
  }

  // ❌ VULNERABILIDAD 2: Command Injection
  async executeCommand(req: Request, res: Response) {
    const { command } = req.body;
    const exec = require('child_process').exec;
    exec(command, (error: any, stdout: any) => {  // Ejecución directa
      return res.send(stdout);
    });
  }

  // ❌ VULNERABILIDAD 3: Eval injection
  async calculate(req: Request, res: Response) {
    const expression = req.body.expression;
    const result = eval(expression); // Uso peligroso de eval
    return res.json({ result });
  }

  // ❌ VULNERABILIDAD 4: Path Traversal
  async readFile(req: Request, res: Response) {
    const filename = req.query.file as string;
    const fs = require('fs');
    const content = fs.readFileSync(`/uploads/${filename}`); // Sin validación
    return res.send(content);
  }

  // ❌ VULNERABILIDAD 5: Hardcoded Credentials
  private dbPassword = 'SuperSecret123!';
  private apiKey = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';
  private secretToken = 'ghp_1234567890abcdefghijklmno';
  
  async connectDatabase() {
    const connection = {
      host: 'localhost',
      user: 'admin',
      password: this.dbPassword // Credenciales hardcodeadas
    };
    return connection;
  }

  // ❌ VULNERABILIDAD 6: Unsafe deserialization
  async processData(req: Request, res: Response) {
    const data = req.body.serialized;
    const obj = JSON.parse(data); // Sin validación
    return res.json(obj);
  }

  // ❌ VULNERABILIDAD 7: Weak cryptography
  async hashPassword(password: string) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(password).digest('hex'); // MD5 es débil
  }
}
