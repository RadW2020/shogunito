import { Dashboard } from 'checkly/constructs';

/**
 * Dashboard principal de estado de Shogun
 *
 * Muestra el estado de todos los checks críticos de Shogun
 * URL pública: https://shogun-status.checklyhq.com
 */
new Dashboard('shogun-status', {
  customUrl: 'shogun-status',
  header: 'Shogun Status',
  description: 'Estado en tiempo real de los servicios de Shogun - API, Frontend y Storage',

  // Mostrar todos los checks con tag 'critical'
  tags: ['critical'],
  useTagsAndOperator: false, // OR: muestra checks con ANY de estos tags

  // Configuración de visualización
  width: 'FULL',
  refreshRate: 60,
  paginate: true,
  paginationRate: 60,
  checksPerPage: 15,

  // Mostrar detalles
  hideTags: false,
  expandChecks: true,
  showHeader: true,
  showP95: true,
  showP99: true,

  // Dashboard público (requerido en free tier)
  isPrivate: false,
});

