'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Rol = 'cliente' | 'vendedor' | 'repartidor';

const ROLES_DISPONIBLES: { value: Rol; label: string; description: string }[] = [
  { value: 'cliente', label: 'Cliente', description: 'Realiza pedidos y rastrea entregas' },
  { value: 'vendedor', label: 'Vendedor', description: 'Captura y gestiona pedidos' },
  { value: 'repartidor', label: 'Repartidor', description: 'Realiza entregas a domicilio' },
];

/**
 * Página de registro.
 * Permite crear una cuenta con nombre, email, contraseña y rol.
 * El rol "admin" no está disponible en el registro público.
 */
export default function RegistroPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>('cliente');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            rol,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Este email ya está registrado. Intenta iniciar sesión.');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!authData.user) {
        setError('Error al crear la cuenta. Intenta de nuevo.');
        return;
      }

      // 2. Crear registro en la tabla usuario con el rol seleccionado
      const { error: dbError } = await supabase.from('usuario').insert({
        id: authData.user.id,
        nombre,
        email,
        rol,
        activo: true,
      });

      if (dbError) {
        // Si falla la inserción en la tabla, el usuario auth ya fue creado
        // pero no tendrá rol asignado hasta que se corrija manualmente
        console.error('Error al crear registro de usuario:', dbError);
        setError(
          'Cuenta creada pero hubo un error al asignar el rol. Contacta al administrador.'
        );
        return;
      }

      // 3. Si la sesión se creó inmediatamente (email confirmation disabled)
      if (authData.session) {
        document.cookie = `sb-access-token=${authData.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        document.cookie = `sb-refresh-token=${authData.session.refresh_token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        router.push('/');
        router.refresh();
      } else {
        // Email confirmation enabled
        setSuccess(true);
      }
    } catch {
      setError('Error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-2xl font-bold text-amber-800 mb-2">
            Revisa tu email
          </h2>
          <p className="text-gray-600 mb-6">
            Hemos enviado un enlace de confirmación a <strong>{email}</strong>.
            Haz clic en el enlace para activar tu cuenta.
          </p>
          <a
            href="/login"
            className="inline-block py-3 px-6 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
          >
            Ir a iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-800">Wings & Burgers</h1>
          <p className="text-amber-600 mt-2">Crea tu cuenta</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="nombre"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nombre completo
            </label>
            <input
              id="nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              placeholder="Tu nombre"
              maxLength={100}
              autoComplete="name"
            />
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="reg-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contraseña
            </label>
            <input
              id="reg-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de cuenta
            </label>
            <div className="space-y-2">
              {ROLES_DISPONIBLES.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    rol === option.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={option.value}
                    checked={rol === option.value}
                    onChange={() => setRol(option.value)}
                    className="mt-0.5 accent-amber-600"
                  />
                  <div>
                    <span className="font-medium text-gray-800">
                      {option.label}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <a
            href="/login"
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
