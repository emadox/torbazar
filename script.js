// ========== Configuración Supabase ==========
// En producción (Netlify), estas variables deben estar en el dashboard de Netlify
// En desarrollo local, se cargan desde /api/config (que lee .env)

let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let supabase = null;

let ventas = [];
let productosUnicos = new Map();
let currentFocus = -1;

// Inicializar Supabase (cargar config desde servidor si está disponible)
async function initSupabase() {
    try {
        // Intentar cargar desde /api/config (servidor local)
        const res = await fetch('/api/config');
        if (res.ok) {
            const config = await res.json();
            SUPABASE_URL = config.supabaseUrl;
            SUPABASE_KEY = config.supabaseKey;
            console.log('✅ Config cargada desde /api/config (servidor local)');
        } else {
            throw new Error('Local /api/config no disponible');
        }
    } catch (err) {
        console.log('ℹ️ /api/config no disponible, intentando /.netlify/functions/config...');
        try {
            // Intentar cargar desde Netlify Function
            const res = await fetch('/.netlify/functions/config');
            if (res.ok) {
                const config = await res.json();
                SUPABASE_URL = config.supabaseUrl;
                SUPABASE_KEY = config.supabaseKey;
                console.log('✅ Config cargada desde /.netlify/functions/config');
            } else {
                throw new Error('Netlify function no disponible');
            }
        } catch (err2) {
            console.log('ℹ️ Netlify function no disponible, intentando variables globales...');
            // Si nada está disponible, usar variables globales (en Netlify, inyectadas por build.js)
            SUPABASE_URL = window.SUPABASE_URL || '';
            SUPABASE_KEY = window.SUPABASE_KEY || '';
        }
    }
    
    console.log('🔍 SUPABASE_URL:', SUPABASE_URL ? '✓ configurado' : '✗ NO configurado');
    console.log('🔍 SUPABASE_KEY:', SUPABASE_KEY ? '✓ configurado' : '✗ NO configurado');
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Error: Variables de Supabase no configuradas. Revisa:');
        console.error('   1. Netlify Settings → Environment variables (agregar SUPABASE_URL y SUPABASE_KEY)');
        console.error('   2. O ejecutar localmente con: npm install && npm start');
        return false;
    }
    
    if (!window.supabase) {
        console.error('❌ Error: Cliente Supabase no cargado. Verifica que @supabase/supabase-js esté en index.html');
        return false;
    }
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.info('✅ Supabase inicializado correctamente');
    return true;
}

// Cargar ventas desde Supabase
async function loadVentas() {
    if (!supabase) {
        console.error('❌ Supabase no inicializado');
        return;
    }
    
    try {
        console.info('📥 Cargando ventas desde Supabase...');
        const { data, error } = await supabase
            .from('ventas')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        ventas = (data || []).map(r => ({
            id: r.id,
            fecha: r.created_at || '',
            producto: r.producto || '',
            cantidad: parseFloat(r.cantidad) || 0,
            costoUnitario: parseFloat(r.costo_unit) || 0,
            totalInvertido: parseFloat(r.total_invertido) || 0,
            precioVenta: parseFloat(r.precio_venta) || 0,
            totalVenta: parseFloat(r.total_venta) || 0,
            ganancia: parseFloat(r.ganancia) || 0,
            margen: parseFloat(r.margen) || 0
        }));
        
        // Reconstruir productosUnicos
        productosUnicos = new Map();
        ventas.forEach(v => {
            if (v.producto) productosUnicos.set(v.producto, { costoUnitario: v.costoUnitario, precioVenta: v.precioVenta });
        });
        
        actualizarTabla();
        actualizarEstadisticas();
        console.info(`✅ Cargadas ${ventas.length} ventas desde Supabase`);
    } catch (err) {
        console.error('❌ Error cargando desde Supabase:', err.message);
        alert('Error al cargar datos. Verifica la consola.');
    }
}

// Guardar una nueva venta en Supabase
async function guardarVentaSupabase(venta) {
    try {
        const { error } = await supabase
            .from('ventas')
            .insert([{
                created_at: venta.fecha,
                producto: venta.producto,
                cantidad: venta.cantidad,
                costo_unit: venta.costoUnitario,
                total_invertido: venta.totalInvertido,
                precio_venta: venta.precioVenta,
                total_venta: venta.totalVenta,
                ganancia: venta.ganancia,
                margen: parseFloat(venta.margen)
            }]);
        
        if (error) throw error;
        console.info('✅ Venta guardada en Supabase');
    } catch (err) {
        console.error('❌ Error guardando venta:', err.message);
        throw err;
    }
}

// Eliminar una venta en Supabase por ID
async function eliminarVentaSupabase(id) {
    try {
        const { error } = await supabase
            .from('ventas')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        console.info('✅ Venta eliminada de Supabase');
    } catch (err) {
        console.error('❌ Error eliminando venta:', err.message);
        throw err;
    }
}

// Guardar todos los datos (usado en importación masiva)
async function saveVentas() {
    try {
        console.info('📤 Sincronizando con Supabase...');
        // Supabase gestiona cambios individuales, esto es para feedback visual
        console.info('✅ Sincronización completada');
        return { ok: true };
    } catch (err) {
        console.error('❌ Error sincronizando:', err);
        throw err;
    }
}

// Llamada desde el botón "Guardar" para mostrar feedback al usuario
function manualSave() {
    const btn = document.getElementById('btnGuardar');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Sincronizando...';
    saveVentas().then(() => {
        btn.textContent = 'Sincronizado';
        setTimeout(() => { btn.textContent = 'Guardar'; btn.disabled = false; }, 1200);
    }).catch(() => {
        alert('Error al sincronizar. Revisa la consola.');
        btn.textContent = 'Guardar';
        btn.disabled = false;
    });
}

document.getElementById('fecha').valueAsDate = new Date();

document.getElementById('productoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    agregarProducto();
});

// Configurar autocompletado
const inputProducto = document.getElementById('producto');
inputProducto.addEventListener('input', function() {
    mostrarAutocompletado(this.value);
});

inputProducto.addEventListener('keydown', function(e) {
    let autocompleteList = document.getElementById('autocomplete-list');
    if (autocompleteList) {
        let items = autocompleteList.getElementsByTagName('div');
        if (e.keyCode === 40) { // Flecha abajo
            e.preventDefault();
            currentFocus++;
            addActive(items);
        } else if (e.keyCode === 38) { // Flecha arriba
            e.preventDefault();
            currentFocus--;
            addActive(items);
        } else if (e.keyCode === 13) { // Enter
            e.preventDefault();
            if (currentFocus > -1 && items[currentFocus]) {
                items[currentFocus].click();
            }
        }
    }
});

document.addEventListener('click', function(e) {
    if (e.target.id !== 'producto') {
        cerrarAutocompletado();
    }
});

function addActive(items) {
    if (!items) return;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].classList.add('autocomplete-active');
}

function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove('autocomplete-active');
    }
}

function cerrarAutocompletado() {
    let autocompleteList = document.getElementById('autocomplete-list');
    if (autocompleteList) {
        autocompleteList.remove();
    }
    currentFocus = -1;
}

function mostrarAutocompletado(valor) {
    cerrarAutocompletado();
    
    if (!valor) return;
    
    currentFocus = -1;
    
    const coincidencias = [];
    productosUnicos.forEach((data, nombre) => {
        if (nombre.toLowerCase().includes(valor.toLowerCase())) {
            coincidencias.push({ nombre, data });
        }
    });
    
    if (coincidencias.length === 0) return;
    
    const div = document.createElement('div');
    div.setAttribute('id', 'autocomplete-list');
    div.setAttribute('class', 'autocomplete-items');
    
    coincidencias.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.innerHTML = `<strong>${item.nombre}</strong><br>
            <small>Último costo: ${formatearNumero(item.data.costoUnitario)} | 
            Último precio: ${formatearNumero(item.data.precioVenta)}</small>`;
        
        itemDiv.addEventListener('click', function() {
            document.getElementById('producto').value = item.nombre;
            document.getElementById('costoUnitario').value = item.data.costoUnitario.toString().replace('.', ',');
            document.getElementById('precioVenta').value = item.data.precioVenta.toString().replace('.', ',');
            cerrarAutocompletado();
        });
        
        div.appendChild(itemDiv);
    });
    
    inputProducto.parentNode.appendChild(div);
}

function actualizarProductosUnicos(producto, costoUnitario, precioVenta) {
    productosUnicos.set(producto, { costoUnitario, precioVenta });
}

function parsearNumero(valor) {
    if (!valor) return 0;
    
    // Eliminar espacios
    valor = String(valor).trim().replace(/\s/g, '');
    
    // Si tiene coma, la tratamos como decimal
    if (valor.includes(',')) {
        // Eliminar puntos (separadores de miles) y reemplazar coma por punto
        valor = valor.replace(/\./g, '').replace(',', '.');
    }
    // Si solo tiene puntos, verificar si es separador de miles o decimal
    else if (valor.includes('.')) {
        // Si hay más de un punto, son separadores de miles
        const puntos = (valor.match(/\./g) || []).length;
        if (puntos > 1) {
            valor = valor.replace(/\./g, '');
        } else {
            // Un solo punto: verificar si es separador de miles o decimal
            const partes = valor.split('.');
            // Si la parte después del punto tiene 3 dígitos, es separador de miles
            if (partes[1] && partes[1].length === 3) {
                valor = valor.replace('.', '');
            }
            // Si no, lo tratamos como decimal (reemplazamos punto por punto, no hace falta cambiar)
        }
    }
    
    return parseFloat(valor) || 0;
}

function agregarProducto() {
    const fecha = document.getElementById('fecha').value;
    const producto = document.getElementById('producto').value;
    const cantidad = parsearNumero(document.getElementById('cantidad').value);
    const costoUnitario = parsearNumero(document.getElementById('costoUnitario').value);
    const precioVenta = parsearNumero(document.getElementById('precioVenta').value);
    
    if (cantidad <= 0 || costoUnitario < 0 || precioVenta < 0) {
        alert('Por favor, ingresa valores válidos');
        return;
    }
    
    const totalInvertido = cantidad * costoUnitario;
    const totalVenta = cantidad * precioVenta;
    const ganancia = totalVenta - totalInvertido;
    const margen = totalInvertido > 0 ? ((ganancia / totalInvertido) * 100).toFixed(2) : 0;
    
    const venta = {
        fecha,
        producto,
        cantidad,
        costoUnitario,
        totalInvertido,
        precioVenta,
        totalVenta,
        ganancia,
        margen
    };
    
    ventas.push(venta);
    actualizarProductosUnicos(producto, costoUnitario, precioVenta);
    actualizarTabla();
    actualizarEstadisticas();
    
    // Guardar en Supabase
    guardarVentaSupabase(venta).catch(err => {
        alert('Error al guardar en Supabase: ' + err.message);
    });
    
    document.getElementById('producto').value = '';
    document.getElementById('cantidad').value = '';
    document.getElementById('costoUnitario').value = '';
    document.getElementById('precioVenta').value = '';
}

function actualizarTabla() {
    const tbody = document.getElementById('ventasBody');
    tbody.innerHTML = '';
    
    ventas.forEach((venta, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${venta.fecha}</td>
            <td>${venta.producto}</td>
            <td>${venta.cantidad}</td>
            <td>${formatearNumero(venta.costoUnitario)}</td>
            <td>${formatearNumero(venta.totalInvertido)}</td>
            <td>${formatearNumero(venta.precioVenta)}</td>
            <td>${formatearNumero(venta.totalVenta)}</td>
            <td class="${venta.ganancia >= 0 ? 'positive' : 'negative'}">${formatearNumero(venta.ganancia)}</td>
            <td class="${venta.ganancia >= 0 ? 'positive' : 'negative'}">${venta.margen}%</td>
            <td><button class="btn-delete" onclick="eliminarVenta(${index})">Eliminar</button></td>
        `;
    });
}

function eliminarVenta(index) {
    if (confirm('¿Estás seguro de eliminar esta venta?')) {
        const ventaAEliminar = ventas[index];
        ventas.splice(index, 1);
        actualizarTabla();
        actualizarEstadisticas();
        
        // Eliminar de Supabase si tiene ID
        if (ventaAEliminar.id) {
            eliminarVentaSupabase(ventaAEliminar.id).catch(err => {
                alert('Error al eliminar de Supabase: ' + err.message);
            });
        }
    }
}

function actualizarEstadisticas() {
    const totalInvertido = ventas.reduce((sum, v) => sum + v.totalInvertido, 0);
    const totalVendido = ventas.reduce((sum, v) => sum + v.totalVenta, 0);
    const gananciaTotal = totalVendido - totalInvertido;
    const cantidadProductos = ventas.reduce((sum, v) => sum + v.cantidad, 0);
    
    document.getElementById('totalInvertido').textContent = formatearNumero(totalInvertido);
    document.getElementById('totalVendido').textContent = formatearNumero(totalVendido);
    document.getElementById('gananciaTotal').textContent = formatearNumero(gananciaTotal);
    document.getElementById('gananciaTotal').className = `value ${gananciaTotal >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('cantidadProductos').textContent = cantidadProductos;
}

function formatearNumero(numero) {
    return '$' + numero.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function exportarExcel() {
    if (ventas.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    const datosExcel = ventas.map(v => ({
        'Fecha': v.fecha,
        'Producto': v.producto,
        'Cantidad': v.cantidad,
        'Costo Unitario': v.costoUnitario,
        'Total Invertido': v.totalInvertido,
        'Precio Venta': v.precioVenta,
        'Total Venta': v.totalVenta,
        'Ganancia': v.ganancia,
        'Margen %': v.margen
    }));
    
    const totalInvertido = ventas.reduce((sum, v) => sum + v.totalInvertido, 0);
    const totalVendido = ventas.reduce((sum, v) => sum + v.totalVenta, 0);
    const gananciaTotal = totalVendido - totalInvertido;
    
    datosExcel.push({});
    datosExcel.push({
        'Fecha': 'RESUMEN',
        'Producto': '',
        'Cantidad': '',
        'Costo Unitario': '',
        'Total Invertido': totalInvertido,
        'Precio Venta': '',
        'Total Venta': totalVendido,
        'Ganancia': gananciaTotal,
        'Margen %': ''
    });
    
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    
    XLSX.writeFile(wb, "TOR_Bazar_Ventas.xlsx");
}

function importarExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            let importados = 0;
            jsonData.forEach(row => {
                if (row.Fecha && row.Fecha !== 'RESUMEN' && row.Producto) {
                    const cantidad = parsearNumero(row.Cantidad);
                    const costoUnitario = parsearNumero(row['Costo Unitario']);
                    const precioVenta = parsearNumero(row['Precio Venta']);
                    const totalInvertido = cantidad * costoUnitario;
                    const totalVenta = cantidad * precioVenta;
                    const ganancia = totalVenta - totalInvertido;
                    const margen = totalInvertido > 0 ? ((ganancia / totalInvertido) * 100).toFixed(2) : 0;
                    
                    ventas.push({
                        fecha: row.Fecha,
                        producto: row.Producto,
                        cantidad: cantidad,
                        costoUnitario: costoUnitario,
                        totalInvertido: totalInvertido,
                        precioVenta: precioVenta,
                        totalVenta: totalVenta,
                        ganancia: ganancia,
                        margen: margen
                    });
                    actualizarProductosUnicos(row.Producto, costoUnitario, precioVenta);
                    importados++;
                }
            });
            
            actualizarTabla();
            actualizarEstadisticas();
            // Guardar importados en Supabase
            const promesas = ventas.slice(-importados).map(v => guardarVentaSupabase(v));
            Promise.all(promesas).catch(err => {
                console.error('Error guardando importados en Supabase:', err);
            });
            alert(`Se importaron ${importados} productos correctamente`);
            
            event.target.value = '';
        } catch (error) {
            alert('Error al importar el archivo. Asegúrate de que sea un archivo Excel válido exportado desde TOR Bazar.');
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    const initialized = await initSupabase();
    if (initialized) {
        loadVentas();
    } else {
        console.error('No se pudo inicializar Supabase');
    }
});
