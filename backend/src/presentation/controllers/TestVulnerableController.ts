import { Request, Response } from 'express';
import { exec } from 'child_process';

/**
 * Controlador de prueba con cÃ³digo VULNERABLE
 * âš ï¸ Este cÃ³digo contiene vulnerabilidades intencionalmente
 * para probar el sistema de anÃ¡lisis ML
 * 
 * Vulnerabilidades incluidas:
 * - InyecciÃ³n NoSQL
 * - InyecciÃ³n de comandos
 * - Sin validaciÃ³n de entrada
 * - Sin sanitizaciÃ³n
 * - Uso de funciones peligrosas
 */
export class TestVulnerableController {
    /**
     * âš ï¸ VULNERABLE: InyecciÃ³n NoSQL
     * No valida ni sanitiza la entrada del usuario
     */
    async vulnerableMethod(req: Request, res: Response) {
        // âš ï¸ VULNERABLE: req.body usado directamente sin validaciÃ³n
        const userId = req.body.userId;
        
        // âš ï¸ VULNERABLE: Query NoSQL sin sanitizaciÃ³n
        const data = await User.find({ _id: userId });
        
        res.json(data);
    }
    
    /**
     * âš ï¸ VULNERABLE: InyecciÃ³n de comandos
     * Ejecuta comandos del sistema con entrada del usuario
     */
    async executeCommand(req: Request, res: Response) {
        // âš ï¸ VULNERABLE: req.body usado directamente
        const command = req.body.command;
        
        // âš ï¸ VULNERABLE: exec() con entrada del usuario
        exec(command, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }
            res.json({ output: stdout });
        });
    }
    
    /**
     * âš ï¸ VULNERABLE: BÃºsqueda sin validaciÃ³n
     * Permite inyecciÃ³n NoSQL
     */
    async unsafeSearch(req: Request, res: Response) {
        // âš ï¸ VULNERABLE: req.query usado directamente
        const searchQuery = req.query.q;
        
        // âš ï¸ VULNERABLE: Consulta directa sin sanitizaciÃ³n
        const results = await User.find(searchQuery);
        
        res.json(results);
    }
    
    /**
     * âš ï¸ VULNERABLE: EvaluaciÃ³n de cÃ³digo dinÃ¡mico
     */
    async dangerousEval(req: Request, res: Response) {
        // âš ï¸ VULNERABLE: eval() con entrada del usuario
        const code = req.body.code;
        const result = eval(code);
        
        res.json({ result });
    }
}
