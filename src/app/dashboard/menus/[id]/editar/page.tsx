"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import MenuForm from '@/components/MenuForm';
import Loader from '@/components/Loader';
import { getMenuById } from '@/lib/sanity/menuService';
import { Menu } from '@/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';

export default function EditarMenuPage() {
  const router = useRouter();
  const params = useParams();
  const menuId = params?.id as string;
  const { showError } = useSweetAlert();

  const [menu, setMenu] = useState<Menu | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      if (!menuId) return;
      try {
        const data = await getMenuById(menuId);
        if (cancelado) return;
        if (!data) {
          // 404 tambien es lo que responde el API con la carta de otra
          // empresa, a proposito: no confirmamos que exista.
          showError('No se encontró la carta');
          router.push('/dashboard/menus');
          return;
        }
        setMenu(data);
      } catch (error) {
        if (cancelado) return;
        console.error('Error cargando la carta:', error);
        showError('No se pudo cargar la carta');
        router.push('/dashboard/menus');
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, [menuId, router, showError]);

  if (cargando || !menu) {
    return (
      <ProtectedRoute>
        <Loader message="Cargando la carta..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MenuForm menu={menu} />
    </ProtectedRoute>
  );
}
