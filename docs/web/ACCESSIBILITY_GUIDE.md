# 🌐 Guía de Accesibilidad Web - WCAG 2.1 AA

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Hooks y Utilidades](#hooks-y-utilidades)
3. [Componentes Accesibles](#componentes-accesibles)
4. [Navegación por Teclado](#navegación-por-teclado)
5. [Focus Visible](#focus-visible)
6. [ARIA Labels](#aria-labels)
7. [Checklist de Accesibilidad](#checklist-de-accesibilidad)
8. [Testing de Accesibilidad](#testing-de-accesibilidad)

---

## Introducción

Esta aplicación cumple con los estándares **WCAG 2.1 AA** para garantizar que sea accesible para todos los usuarios, incluyendo aquellos que utilizan tecnologías de asistencia.

### Principios Clave (POUR)

- **Perceptible**: La información debe ser presentable para todos los usuarios
- **Operable**: Los componentes de UI deben ser operables por todos
- **Comprensible**: La información y operación debe ser comprensible
- **Robusto**: El contenido debe ser robusto para tecnologías de asistencia

---

## Hooks y Utilidades

### `useKeyboardNavigation`

Hook para manejar navegación por teclado:

```typescript
import { useKeyboardNavigation } from '@/shared/hooks/useKeyboardNavigation';

function MyComponent() {
  useKeyboardNavigation({
    onEnter: () => handleSubmit(),
    onEscape: () => handleClose(),
    onArrowUp: () => navigateUp(),
    onArrowDown: () => navigateDown(),
  });

  return <div>...</div>;
}
```

### `useFocusTrap`

Trap focus dentro de modales/dialogs:

```typescript
import { useFocusTrap } from '@/shared/hooks/useKeyboardNavigation';

function Modal({ isOpen }: { isOpen: boolean }) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  return <div ref={modalRef} role="dialog">...</div>;
}
```

### `useFocusRestore`

Restaurar focus al cerrar modales:

```typescript
import { useFocusRestore } from '@/shared/hooks/useKeyboardNavigation';

function Modal() {
  useFocusRestore(); // Restaura focus al desmontar

  return <div>...</div>;
}
```

### `useAriaLiveAnnouncement`

Anunciar cambios a lectores de pantalla:

```typescript
import { useAriaLiveAnnouncement } from '@/shared/hooks/useKeyboardNavigation';

function MyComponent() {
  const { announce } = useAriaLiveAnnouncement();

  const handleAction = () => {
    // ... perform action
    announce('Item added successfully', 'polite');
  };

  return <button onClick={handleAction}>Add Item</button>;
}
```

---

## Componentes Accesibles

### Botones de Iconos

**❌ Incorrecto:**

```tsx
<button onClick={handleClose}>
  <XIcon />
</button>
```

**✅ Correcto:**

```tsx
import { AriaLabels, getIconButtonA11yProps } from '@/shared/utils/accessibility';

<button
  onClick={handleClose}
  {...getIconButtonA11yProps(AriaLabels.close)}
  className="icon-button focus-visible"
>
  <XIcon aria-hidden="true" />
  <span className="sr-only">{AriaLabels.close}</span>
</button>;
```

### Modales/Diálogos

**✅ Modal Accesible:**

```tsx
import { getDialogA11yProps } from '@/shared/utils/accessibility';
import { useFocusTrap, useFocusRestore } from '@/shared/hooks/useKeyboardNavigation';

function AccessibleModal({ isOpen, onClose, title, children }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = 'modal-title';
  const descriptionId = 'modal-description';

  useFocusTrap(modalRef, isOpen);
  useFocusRestore();

  if (!isOpen) return null;

  return (
    <>
      <div className="dialog-backdrop" aria-hidden="true" />
      <div
        ref={modalRef}
        {...getDialogA11yProps({ titleId, descriptionId, isOpen })}
        className="modal-container"
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="icon-button focus-visible">
            <XIcon aria-hidden="true" />
          </button>
        </header>
        <div id={descriptionId}>{children}</div>
      </div>
    </>
  );
}
```

### Formularios

**✅ Campo de Formulario Accesible:**

```tsx
import { getFormFieldA11yProps } from '@/shared/utils/accessibility';

function FormField({ label, name, error, required }) {
  const errorId = `${name}-error`;

  return (
    <div className={required ? 'required-field' : ''}>
      <label htmlFor={name}>
        {label}
        {required && (
          <span aria-label="required" className="sr-only">
            *
          </span>
        )}
      </label>
      <input
        {...getFormFieldA11yProps(name, {
          required,
          invalid: !!error,
          errorId: error ? errorId : undefined,
        })}
        className="focus-visible"
      />
      {error && (
        <div id={errorId} role="alert" className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}
```

### Listas y Menús

**✅ Lista Accesible:**

```tsx
import { getListA11yProps } from '@/shared/utils/accessibility';

function ItemList({ items, onSelect }) {
  return (
    <ul {...getListA11yProps({ label: 'Project items' })}>
      {items.map((item, index) => (
        <li key={item.id} role="listitem">
          <button
            onClick={() => onSelect(item)}
            aria-label={`Select ${item.name}`}
            className="focus-visible"
          >
            {item.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

---

## Navegación por Teclado

### Teclas Estándar

| Tecla              | Acción                                   |
| ------------------ | ---------------------------------------- |
| `Tab`              | Navegar al siguiente elemento focuseable |
| `Shift + Tab`      | Navegar al elemento focuseable anterior  |
| `Enter`            | Activar botón/link                       |
| `Space`            | Activar botón                            |
| `Escape`           | Cerrar modal/dialog                      |
| `Arrow Up/Down`    | Navegar en listas/menús                  |
| `Arrow Left/Right` | Navegar en tabs/carousels                |
| `Home`             | Ir al primer elemento                    |
| `End`              | Ir al último elemento                    |

### Implementación

```typescript
// Example: Keyboard navigable list
function KeyboardList({ items, onSelect }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useKeyboardNavigation({
    onArrowDown: () => {
      setSelectedIndex((prev) =>
        prev < items.length - 1 ? prev + 1 : prev
      );
    },
    onArrowUp: () => {
      setSelectedIndex((prev) => prev > 0 ? prev - 1 : prev);
    },
    onEnter: () => {
      onSelect(items[selectedIndex]);
    },
  });

  return (
    <ul role="listbox" aria-label="Items">
      {items.map((item, index) => (
        <li
          key={item.id}
          role="option"
          aria-selected={index === selectedIndex}
          className={index === selectedIndex ? 'selected focus-visible' : ''}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

---

## Focus Visible

### Aplicar Focus Visible

**CSS Approach:**

```tsx
<button className="focus-visible">Click me</button>
```

**Inline Styles:**

```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Click me
</button>
```

### Focus Trap en Modales

```typescript
// Automáticamente aplicado con useFocusTrap
const modalRef = useRef<HTMLDivElement>(null);
useFocusTrap(modalRef, isOpen);
```

### Skip to Main Content

Agregar link de "Skip to content" al inicio de la página:

```tsx
function App() {
  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <nav>...</nav>
      <main id="main-content" tabIndex={-1}>
        {/* Main content */}
      </main>
    </>
  );
}
```

---

## ARIA Labels

### Catálogo de Labels Comunes

```typescript
import { AriaLabels } from '@/shared/utils/accessibility';

// Acciones básicas
AriaLabels.close; // "Close"
AriaLabels.save; // "Save"
AriaLabels.delete; // "Delete"
AriaLabels.edit; // "Edit"

// Constructores contextuales
AriaLabels.closeDialog('Settings'); // "Close Settings dialog"
AriaLabels.editItem('project', 'My Project'); // "Edit project My Project"
AriaLabels.deleteItem('shot', 'Shot 010'); // "Delete shot Shot 010"
```

### Iconos Decorativos

Siempre marcar iconos como decorativos cuando hay texto:

```tsx
<button aria-label="Save">
  <SaveIcon aria-hidden="true" />
  Save
</button>
```

### SVG Accessibility

```tsx
<svg role="img" aria-labelledby="icon-title" focusable="false">
  <title id="icon-title">Save icon</title>
  <path d="..." />
</svg>
```

---

## Checklist de Accesibilidad

### ✅ Para Cada Componente

- [ ] Todos los botones de iconos tienen `aria-label`
- [ ] Los iconos decorativos tienen `aria-hidden="true"`
- [ ] Todos los elementos interactivos son focuseables
- [ ] El focus visible es claro (outline o ring)
- [ ] La navegación por teclado funciona (Tab, Enter, Escape)
- [ ] Los modales tienen focus trap
- [ ] Los modales tienen `role="dialog"` y `aria-modal="true"`
- [ ] Los modales restauran el focus al cerrarse
- [ ] Los formularios tienen labels asociados
- [ ] Los errores de formulario usan `role="alert"`
- [ ] Los campos requeridos están marcados (`aria-required="true"`)
- [ ] Los estados de carga usan `aria-busy="true"`
- [ ] Las listas usan `role="list"` y `role="listitem"`
- [ ] Los cambios dinámicos se anuncian con `aria-live`

### ✅ Para Cada Página

- [ ] Tiene estructura semántica HTML5 (`<header>`, `<nav>`, `<main>`, `<footer>`)
- [ ] Tiene heading hierarchy (`<h1>`, `<h2>`, `<h3>`)
- [ ] Tiene "Skip to main content" link
- [ ] Todos los links tienen texto descriptivo
- [ ] Las imágenes tienen `alt` text descriptivo
- [ ] El contraste de color cumple WCAG AA (4.5:1 para texto normal)
- [ ] Los videos tienen captions/subtítulos

---

## Testing de Accesibilidad

### Herramientas Automáticas

1. **axe DevTools** (Chrome Extension)
   - Detecta problemas de accesibilidad automáticamente

2. **Lighthouse** (Chrome DevTools)

   ```bash
   # Run accessibility audit
   npm run lighthouse
   ```

3. **jest-axe** (Unit Tests)

   ```typescript
   import { axe, toHaveNoViolations } from 'jest-axe';
   expect.extend(toHaveNoViolations);

   test('has no accessibility violations', async () => {
     const { container } = render(<MyComponent />);
     const results = await axe(container);
     expect(results).toHaveNoViolations();
   });
   ```

### Testing Manual

**Keyboard Navigation:**

1. Usar solo teclado (sin mouse)
2. Verificar que todo es accesible con Tab
3. Verificar que Enter/Space activan botones
4. Verificar que Escape cierra modales

**Screen Reader:**

1. NVDA (Windows) o VoiceOver (Mac)
2. Verificar que todos los elementos se anuncian correctamente
3. Verificar que los cambios dinámicos se anuncian
4. Verificar que los modales se manejan correctamente

**Focus Indicators:**

1. Verificar que todos los elementos focuseables tienen indicador visible
2. Verificar que el contraste del indicador cumple WCAG AA

---

## Recursos Adicionales

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [The A11Y Project](https://www.a11yproject.com/)

---

## Contacto y Soporte

Para preguntas sobre accesibilidad, contactar al equipo de desarrollo.

**¡La accesibilidad es responsabilidad de todos! 🌟**
