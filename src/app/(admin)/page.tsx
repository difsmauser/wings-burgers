import Link from 'next/link';

const ADMIN_SECTIONS = [
  {
    href: '/productos',
    title: 'Productos',
    description: 'Gestionar catálogo de alitas, hamburguesas y bebidas',
    icon: '🍗',
    color: 'bg-brand-100 border-brand-300',
  },
  {
    href: '/precios',
    title: 'Precios',
    description: 'Actualizar precios y ver historial de cambios',
    icon: '💰',
    color: 'bg-golden-100 border-golden-300',
  },
  {
    href: '/gastos',
    title: 'Gastos',
    description: 'Registrar y consultar gastos del negocio',
    icon: '📊',
    color: 'bg-fire-100 border-fire-300',
  },
  {
    href: '/inventario',
    title: 'Inventario',
    description: 'Control de existencias e ingredientes',
    icon: '📦',
    color: 'bg-wood-100 border-wood-300',
  },
  {
    href: '/cortes',
    title: 'Cortes',
    description: 'Reportes financieros diarios, semanales y mensuales',
    icon: '📈',
    color: 'bg-green-100 border-green-300',
  },
  {
    href: '/clientes',
    title: 'Clientes',
    description: 'Ver historial y datos de los clientes',
    icon: '👥',
    color: 'bg-brand-100 border-brand-300',
  },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-wood-900">Panel de Administración</h1>
        <p className="text-wood-600 mt-1">
          Bienvenido al panel de gestión de Wings & Burgers
        </p>
      </div>

      {/* Quick access grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ADMIN_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={`
              block p-6 rounded-xl border-2 ${section.color}
              hover:shadow-md transition-shadow duration-200
            `}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{section.icon}</span>
              <div>
                <h3 className="font-semibold text-wood-800">{section.title}</h3>
                <p className="text-sm text-wood-600 mt-1">{section.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
