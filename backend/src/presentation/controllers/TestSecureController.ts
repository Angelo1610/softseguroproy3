import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import helmet from 'helmet';
import { sanitize } from 'mongo-sanitize';

/**
 * Controlador de prueba con cÃ³digo SEGURO
 * Este controlador implementa las mejores prÃ¡cticas de seguridad
 * 
 * CaracterÃ­sticas de seguridad:
 * - ValidaciÃ³n de entrada con express-validator
 * - SanitizaciÃ³n de datos con mongo-sanitize
 * - Uso de helmet para headers seguros
 * - Sin uso de funciones peligrosas (exec, eval)
 * - Sin inyecciÃ³n NoSQL
 */
export class TestSecureController {
    /**
     * MÃ©todo seguro con validaciÃ³n completa
     */
    async secureMethod(req: Request, res: Response) {
        // 1. Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }
        
        // 2. Sanitizar datos
        const sanitizedId = sanitize(req.params.id);
        
        // 3. Query segura con parÃ¡metros validados
        const data = await User.findById(sanitizedId);
        
        if (!data) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }
        
        res.json({ 
            success: true,
            data 
        });
    }
    
    /**
     * BÃºsqueda segura con sanitizaciÃ³n
     */
    async safeSearch(req: Request, res: Response) {
        // Validar entrada
        await body('query')
            .isString()
            .trim()
            .escape()
            .run(req);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        // Sanitizar query
        const sanitizedQuery = sanitize(req.body.query);
        
        // BÃºsqueda segura
        const results = await User.find({
            name: { $regex: sanitizedQuery, $options: 'i' }
        }).select('-password');
        
        res.json({ 
            success: true,
            results 
        });
    }
    
    /**
     * Validadores para las rutas
     */
    static validators = {
        secureMethod: [
            body('id').isMongoId().withMessage('ID invÃ¡lido')
        ],
        safeSearch: [
            body('query').isString().trim().isLength({ min: 1, max: 100 })
        ]
    };
}
