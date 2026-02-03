/**
 * Validadores de Dominio
 * Implementan reglas de negocio para validación de datos
 * 
 * Patrón de Diseño: Strategy Pattern
 * - Permite intercambiar algoritmos de validación sin modificar el código cliente
 * 
 * Principio SOLID: Open/Closed
 * - Abierto para extensión (nuevos validadores), cerrado para modificación
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Interfaz para estrategias de validación
 * Principio SOLID: Interface Segregation
 */
export interface IValidator<T> {
  validate(data: T): ValidationResult;
}

/**
 * Validador de Email
 * Strategy Pattern: Estrategia concreta de validación
 */
export class EmailValidator implements IValidator<string> {
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validate(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('El email es requerido');
      return { isValid: false, errors };
    }

    if (!this.emailRegex.test(email)) {
      errors.push('El formato del email es inválido');
    }

    if (email.length > 255) {
      errors.push('El email no puede exceder 255 caracteres');
    }

    // Prevenir inyección: validar caracteres peligrosos
    if (this.containsDangerousChars(email)) {
      errors.push('El email contiene caracteres no permitidos');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private containsDangerousChars(input: string): boolean {
    const dangerousChars = /[<>'";\\/]/;
    return dangerousChars.test(input);
  }
}

/**
 * Validador de Nombre
 * Strategy Pattern: Estrategia concreta de validación
 */
export class NameValidator implements IValidator<string> {
  validate(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('El nombre es requerido');
      return { isValid: false, errors };
    }

    if (name.length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (name.length > 100) {
      errors.push('El nombre no puede exceder 100 caracteres');
    }

    // Solo letras, espacios, guiones y apóstrofes
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/;
    if (!nameRegex.test(name)) {
      errors.push('El nombre contiene caracteres no permitidos');
    }

    // Prevenir XSS
    if (this.containsHTMLTags(name)) {
      errors.push('El nombre no puede contener HTML');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private containsHTMLTags(input: string): boolean {
    const htmlRegex = /<[^>]*>/;
    return htmlRegex.test(input);
  }
}

/**
 * Validador de Rol
 * Strategy Pattern: Estrategia concreta de validación
 */
export class RoleValidator implements IValidator<string> {
  private readonly validRoles = ['admin', 'client'];

  validate(role: string): ValidationResult {
    const errors: string[] = [];

    if (!role) {
      errors.push('El rol es requerido');
      return { isValid: false, errors };
    }

    if (!this.validRoles.includes(role.toLowerCase())) {
      errors.push(`El rol debe ser uno de: ${this.validRoles.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Validador Compuesto
 * Patrón de Diseño: Composite Pattern (variante)
 * Permite combinar múltiples validadores
 */
export class CompositeValidator<T> implements IValidator<T> {
  constructor(private validators: IValidator<T>[]) {}

  validate(data: T): ValidationResult {
    const allErrors: string[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(data);
      if (!result.isValid) {
        allErrors.push(...result.errors);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }
}

/**
 * Factory para crear validadores
 * Patrón de Diseño: Factory Pattern
 * Centraliza la creación de validadores
 */
export class ValidatorFactory {
  static createEmailValidator(): IValidator<string> {
    return new EmailValidator();
  }

  static createNameValidator(): IValidator<string> {
    return new NameValidator();
  }

  static createRoleValidator(): IValidator<string> {
    return new RoleValidator();
  }

  /**
   * Crear un validador compuesto para datos de usuario
   */
  static createUserDataValidator(): {
    validateEmail: (email: string) => ValidationResult;
    validateName: (name: string) => ValidationResult;
    validateRole: (role: string) => ValidationResult;
  } {
    return {
      validateEmail: (email: string) => this.createEmailValidator().validate(email),
      validateName: (name: string) => this.createNameValidator().validate(name),
      validateRole: (role: string) => this.createRoleValidator().validate(role),
    };
  }
}
