# Patrón para Arreglar Tests E2E

## ✅ Patrón que Funciona

Este patrón se ha probado y funciona. Úsalo para arreglar tests flaky:

### 1. Navegación y Esperas Iniciales

```typescript
// ✅ CORRECTO
await page.goto('/register'); // o '/login'
await page.waitForLoadState('networkidle');
await expect(page).toHaveURL(/\/register/, { timeout: 10000 }); // Verificar URL
await page.waitForSelector(
  'form[data-testid="register-form"], form', // Selector con fallback
  { state: 'visible', timeout: 15000 }
);
await page.waitForTimeout(1000); // Espera para React
```

### 2. Llenar Campos del Formulario

```typescript
// ✅ CORRECTO - Usar form.fillField() helper
await form.fillField('name', userData.name);
await form.fillField('email', userData.email);
await form.fillField('password', userData.password);
await form.fillField('confirmPassword', userData.password);

// ❌ INCORRECTO - No usar page.fill() directo
await page.fill('input[name="email"]', userData.email);
```

### 3. Botones de Submit

```typescript
// ✅ CORRECTO - Selector robusto con fallback
const submitBtn = page.locator(
  'button[data-testid="register-submit-button"], button[data-testid="login-submit-button"], button[type="submit"]'
);
await submitBtn.waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(300); // Espera para validación
await submitBtn.click();

// ❌ INCORRECTO - Selector simple
await page.click('button[type="submit"]');
```

### 4. Selectores de Formulario

```typescript
// ✅ CORRECTO - Para registro
await page.waitForSelector(
  'form[data-testid="register-form"], form', 
  { state: 'visible', timeout: 15000 }
);

// ✅ CORRECTO - Para login
await page.waitForSelector(
  'form[data-testid="login-form"], form', 
  { state: 'visible', timeout: 15000 }
);

// ❌ INCORRECTO - Selector genérico o incorrecto
await page.waitForSelector('form', { timeout: 10000 });
await page.waitForSelector('form[data-testid="register-form"]', ...); // En test de login
```

## Checklist para Arreglar un Test

- [ ] Usar `form.fillField()` en lugar de `page.fill()` directo
- [ ] Verificar URL después de `goto()` con `expect(page).toHaveURL()`
- [ ] Usar selector de formulario correcto (`register-form` vs `login-form`)
- [ ] Esperar formulario con timeout de 15000ms
- [ ] Esperar 1000ms después de que el formulario esté visible
- [ ] Usar selector robusto para botón de submit con fallbacks
- [ ] Esperar botón visible antes de hacer click
- [ ] Esperar 300ms antes de hacer click en submit

## Ejemplo Completo

```typescript
test('should do something', async ({ page, form }) => {
  // 1. Navegación
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/register/, { timeout: 10000 });
  
  // 2. Esperar formulario
  await page.waitForSelector(
    'form[data-testid="register-form"], form', 
    { state: 'visible', timeout: 15000 }
  );
  await page.waitForTimeout(1000);
  
  // 3. Llenar campos
  await form.fillField('name', 'Test User');
  await form.fillField('email', 'test@test.com');
  await form.fillField('password', 'Test123456!');
  await form.fillField('confirmPassword', 'Test123456!');
  
  // 4. Submit
  const submitBtn = page.locator(
    'button[data-testid="register-submit-button"], button[type="submit"]'
  );
  await submitBtn.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(300);
  await submitBtn.click();
  
  // 5. Assertions
  await page.waitForURL('/', { timeout: 10000 });
});
```

## Por Qué Funciona

1. **Selectores robustos**: Múltiples fallbacks evitan fallos por cambios en el DOM
2. **Esperas adecuadas**: Timeouts más largos dan tiempo a React para renderizar
3. **Verificación de URL**: Confirma que la navegación fue exitosa
4. **Helper form.fillField()**: Maneja selectores complejos y esperas internas
5. **Esperas entre acciones**: Evita condiciones de carrera con React re-renders

## Tests Arreglados con Este Patrón

- ✅ `should register a new user successfully` - Funciona perfectamente
- 🔄 Aplicando a otros tests...
