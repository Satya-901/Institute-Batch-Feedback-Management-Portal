'use client';

// Dynamically import SweetAlert2 and Notyf on browser to prevent SSR issues
let notyfInstance: any = null;

const getNotyf = async () => {
  if (typeof window === 'undefined') return null;
  if (!notyfInstance) {
    try {
      const { Notyf } = await import('notyf');
      notyfInstance = new Notyf({
        duration: 3500,
        position: { x: 'right', y: 'top' },
        dismissible: true,
        types: [
          {
            type: 'info',
            background: '#0284c7', // Sky-600
            icon: false,
          },
          {
            type: 'success',
            background: '#0f766e', // Teal-700
            icon: false,
          },
          {
            type: 'error',
            background: '#b91c1c', // Red-700
            icon: false,
          },
        ],
      });
    } catch {
      // Fallback
      return null;
    }
  }
  return notyfInstance;
};

const getSwal = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const SwalModule = await import('sweetalert2');
    return SwalModule.default;
  } catch {
    return null;
  }
};

export const toastSuccess = async (message: string) => {
  const notyf = await getNotyf();
  if (notyf) {
    notyf.success(message);
  } else if (typeof window !== 'undefined') {
    console.log('[Success]', message);
  }
};

export const toastError = async (message: string) => {
  const notyf = await getNotyf();
  if (notyf) {
    notyf.error(message);
  } else if (typeof window !== 'undefined') {
    console.error('[Error]', message);
  }
};

export const toastInfo = async (message: string) => {
  const notyf = await getNotyf();
  if (notyf) {
    notyf.open({ type: 'info', message });
  } else if (typeof window !== 'undefined') {
    console.info('[Info]', message);
  }
};

export const alertSuccess = async (title: string, text?: string) => {
  const Swal = await getSwal();
  if (Swal) {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonColor: '#0f766e',
      confirmButtonText: 'Great',
      customClass: {
        popup: 'rounded-xl shadow-2xl border border-slate-200',
        title: 'text-slate-800 text-lg font-semibold',
        htmlContainer: 'text-slate-600 text-sm',
      },
    });
  }
};

export const alertError = async (title: string, text?: string) => {
  const Swal = await getSwal();
  if (Swal) {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonColor: '#b91c1c',
      confirmButtonText: 'Understand',
      customClass: {
        popup: 'rounded-xl shadow-2xl border border-slate-200',
        title: 'text-slate-800 text-lg font-semibold',
        htmlContainer: 'text-slate-600 text-sm',
      },
    });
  }
};

export const alertWarning = async (title: string, text?: string) => {
  const Swal = await getSwal();
  if (Swal) {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonColor: '#d97706',
      confirmButtonText: 'Understood',
      customClass: {
        popup: 'rounded-xl shadow-2xl border border-slate-200',
        title: 'text-slate-800 text-lg font-semibold',
        htmlContainer: 'text-slate-600 text-sm',
      },
    });
  }
};

export const confirmAction = async (options: {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDestructive?: boolean;
}): Promise<boolean> => {
  const Swal = await getSwal();
  if (Swal) {
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.isDestructive ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: options.isDestructive ? '#dc2626' : '#0f766e',
      cancelButtonColor: '#64748b',
      confirmButtonText: options.confirmButtonText || 'Confirm',
      cancelButtonText: options.cancelButtonText || 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-xl shadow-2xl border border-slate-200',
        title: 'text-slate-900 text-base font-semibold',
        htmlContainer: 'text-slate-600 text-sm',
        confirmButton: 'px-4 py-2 font-medium rounded-lg text-sm text-white',
        cancelButton: 'px-4 py-2 font-medium rounded-lg text-sm text-white',
      },
    });
    return result.isConfirmed;
  }
  return typeof window !== 'undefined' ? window.confirm(options.title) : false;
};
