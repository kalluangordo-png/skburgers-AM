export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const printOrderTicket = (orderId: string) => {
  const ticketElement = document.getElementById(`print-ticket-${orderId}`);
  if (!ticketElement) {
    console.error(`Ticket element for order ${orderId} not found`);
    return;
  }

  const printWindow = window.open('', '_blank', 'width=600,height=600');
  if (printWindow) {
    printWindow.document.write('<html><head><title>SK BURGERS - TICKET</title>');
    // Import Tailwind for the print window
    printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(ticketElement.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    // Wait for Tailwind to load before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  }
};

export const compressImage = (file: File, maxWidth: number, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const sendWhatsAppStatus = (order: any, type: 'preparo' | 'entrega') => {
  const firstName = order.cliente.nome.split(' ')[0].toUpperCase();
  let message = '';
  
  if (type === 'preparo') {
    message = `Oi ${firstName}! Seu pedido #${order.numeroComanda} já está na chapa! 🔥`;
  } else {
    message = `Oi ${firstName}! Seu pedido #${order.numeroComanda} saiu para entrega! 🛵💨`;
  }
  
  let targetPhone = order.customerPhone.replace(/\s+/g, '');
  if (targetPhone.length <= 11) targetPhone = `55${targetPhone}`;
  
  const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export const getAddonEmoji = (name: string) => {
  const n = (name || '').toUpperCase();
  if (n.includes('BACON')) return '🥓';
  if (n.includes('CARNE')) return '🥩';
  if (n.includes('QUEIJO')) return '🧀';
  if (n.includes('OVO')) return '🍳';
  if (n.includes('CEBOLA')) return '🧅';
  if (n.includes('SALADA')) return '🥗';
  if (n.includes('CALABRESA')) return '🍕';
  if (n.includes('FRANGO')) return '🍗';
  if (n.includes('CHEDDAR')) return '🧀';
  if (n.includes('CATUPIRY')) return '🧀';
  return '✨';
};
