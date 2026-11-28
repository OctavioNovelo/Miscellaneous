// biblioteca.cpp - Simulador de biblioteca.
// Temas: ciclos, if/else, funciones, arreglos, manejo de archivos (.dat) y librería propia (utilidades.h).
// Sin clases: los datos son arreglos paralelos y una matriz de préstamos.
// Compilar: g++ -std=c++98 -Wall -pedantic -o biblioteca biblioteca.cpp
#include <fstream>
#include "utilidades.h"

// ---------- Constantes ----------
const int MAX_LIBROS = 100;
const int MAX_USUARIOS = 100;
const int MAX_PRESTAMOS = 500;
const int LIMITE_LIBROS = 3;      // libros activos por persona
const int DIAS_PRESTAMO = 7;      // días que se puede tener el libro sin multa
const int MULTA_POR_DIA = 5;      // multa por día de retraso
const string CLAVE_ADMIN = "admin123";  // clave fija para el ejercicio

// Columnas de la matriz de préstamos
const int COL_LIBRO = 0;      // id del libro
const int COL_USUARIO = 1;    // id del usuario
const int COL_DEVOL = 2;      // 0 = todavía prestado, 1 = ya devuelto
const int COL_MULTA = 3;      // multa cobrada al devolver
const int NUM_COLS = 4;

// ---------- Datos (arreglos paralelos: la posición i describe al mismo registro) ----------
int    libro_id[MAX_LIBROS];
string libro_titulo[MAX_LIBROS];
string libro_autor[MAX_LIBROS];
string libro_categoria[MAX_LIBROS];
int    libro_existencias[MAX_LIBROS];   // copias DISPONIBLES
int    num_libros = 0;
int    ultimo_id_libro = 0;

int    usuario_id[MAX_USUARIOS];
string usuario_nombre[MAX_USUARIOS];
int    usuario_multa[MAX_USUARIOS];     // multa pendiente
int    num_usuarios = 0;
int    ultimo_id_usuario = 0;

int prestamos[MAX_PRESTAMOS][NUM_COLS]; // matriz de préstamos
int num_prestamos = 0;

// ---------- Búsquedas auxiliares ----------
int buscar_libro_id(int id) {
    for (int i = 0; i < num_libros; i++) {
        if (libro_id[i] == id) return i;
    }
    return -1;
}

int buscar_usuario_id(int id) {
    for (int i = 0; i < num_usuarios; i++) {
        if (usuario_id[i] == id) return i;
    }
    return -1;
}

int buscar_libro_titulo(string t) {
    for (int i = 0; i < num_libros; i++) {
        if (minusculas(libro_titulo[i]) == minusculas(t)) return i;
    }
    return -1;
}

// Cuántos libros tiene prestados (sin devolver) el usuario con ese id
int activos_de(int uid) {
    int n = 0;
    for (int r = 0; r < num_prestamos; r++) {
        if (prestamos[r][COL_USUARIO] == uid && prestamos[r][COL_DEVOL] == 0) n++;
    }
    return n;
}

// Fila del préstamo activo de ese usuario con ese libro, o -1
int fila_activa(int lid, int uid) {
    for (int r = 0; r < num_prestamos; r++) {
        if (prestamos[r][COL_LIBRO] == lid && prestamos[r][COL_USUARIO] == uid
            && prestamos[r][COL_DEVOL] == 0) return r;
    }
    return -1;
}

// Cuántas copias de ese libro están prestadas en este momento
int copias_prestadas(int lid) {
    int n = 0;
    for (int r = 0; r < num_prestamos; r++) {
        if (prestamos[r][COL_LIBRO] == lid && prestamos[r][COL_DEVOL] == 0) n++;
    }
    return n;
}

// Veces que se ha prestado el libro (todo el historial)
int veces_prestado(int lid) {
    int n = 0;
    for (int r = 0; r < num_prestamos; r++) {
        if (prestamos[r][COL_LIBRO] == lid) n++;
    }
    return n;
}

// Pide un usuario por id y devuelve su posición (o -1)
int pedir_usuario() {
    int id = leer_entero("Id de usuario: ", 1, 999999);
    int u = buscar_usuario_id(id);
    if (u == -1) cout << "  No existe un usuario con ese id.\n";
    return u;
}

// Pide un libro por título exacto y devuelve su posición (o -1)
int pedir_libro() {
    string t = leer_texto("Titulo exacto del libro: ");
    int l = buscar_libro_titulo(t);
    if (l == -1) cout << "  No se encontro ese titulo (use la busqueda para verlo).\n";
    return l;
}

// Texto no vacío y sin '_' (el '_' se usa para guardar los espacios en el archivo)
string leer_campo(string msg) {
    while (true) {
        string s = leer_texto(msg);
        bool tiene_guion = false;
        for (int i = 0; i < (int)s.length(); i++) {
            if (s[i] == '_') tiene_guion = true;
        }
        if (s.length() == 0) cout << "  No puede estar vacio.\n";
        else if (tiene_guion) cout << "  No use el caracter '_'.\n";
        else return s;
    }
}

// ---------- Archivos ----------
// Formato: primero el último id y la cantidad de registros, luego un registro por línea.
// Los textos con espacios se guardan con '_' para poder leerlos con >>.
// No se guarda ningún reloj: los préstamos solo guardan si ya fueron devueltos y la multa.
void guardar_todo() {
    ofstream fl("libros.dat");
    if (fl.is_open()) {
        fl << ultimo_id_libro << " " << num_libros << "\n";
        for (int i = 0; i < num_libros; i++) {
            fl << libro_id[i] << " " << espacios_a_guion(libro_titulo[i]) << " "
               << espacios_a_guion(libro_autor[i]) << " "
               << espacios_a_guion(libro_categoria[i]) << " " << libro_existencias[i] << "\n";
        }
        fl.close();
    } else {
        cout << "Unable to open file libros.dat\n";
    }

    ofstream fu("usuarios.dat");
    if (fu.is_open()) {
        fu << ultimo_id_usuario << " " << num_usuarios << "\n";
        for (int i = 0; i < num_usuarios; i++) {
            fu << usuario_id[i] << " " << espacios_a_guion(usuario_nombre[i]) << " "
               << usuario_multa[i] << "\n";
        }
        fu.close();
    } else {
        cout << "Unable to open file usuarios.dat\n";
    }

    ofstream fp("prestamos.dat");
    if (fp.is_open()) {
        fp << num_prestamos << "\n";
        for (int r = 0; r < num_prestamos; r++) {
            for (int c = 0; c < NUM_COLS; c++) fp << prestamos[r][c] << " ";
            fp << "\n";
        }
        fp.close();
    } else {
        cout << "Unable to open file prestamos.dat\n";
    }
}

void cargar_todo() {
    string titulo, autor, categoria, nombre;

    ifstream fl("libros.dat");
    if (fl.is_open()) {
        fl >> ultimo_id_libro >> num_libros;
        if (num_libros > MAX_LIBROS) num_libros = MAX_LIBROS;
        if (num_libros < 0) num_libros = 0;
        for (int i = 0; i < num_libros; i++) {
            fl >> libro_id[i] >> titulo >> autor >> categoria >> libro_existencias[i];
            libro_titulo[i] = guion_a_espacios(titulo);
            libro_autor[i] = guion_a_espacios(autor);
            libro_categoria[i] = guion_a_espacios(categoria);
        }
        fl.close();
    } else {
        cout << "Unable to open file libros.dat (se empieza con catalogo vacio)\n";
    }

    ifstream fu("usuarios.dat");
    if (fu.is_open()) {
        fu >> ultimo_id_usuario >> num_usuarios;
        if (num_usuarios > MAX_USUARIOS) num_usuarios = MAX_USUARIOS;
        if (num_usuarios < 0) num_usuarios = 0;
        for (int i = 0; i < num_usuarios; i++) {
            fu >> usuario_id[i] >> nombre >> usuario_multa[i];
            usuario_nombre[i] = guion_a_espacios(nombre);
        }
        fu.close();
    } else {
        cout << "Unable to open file usuarios.dat (se empieza sin usuarios)\n";
    }

    ifstream fp("prestamos.dat");
    if (fp.is_open()) {
        fp >> num_prestamos;
        if (num_prestamos > MAX_PRESTAMOS) num_prestamos = MAX_PRESTAMOS;
        if (num_prestamos < 0) num_prestamos = 0;
        for (int r = 0; r < num_prestamos; r++) {
            for (int c = 0; c < NUM_COLS; c++) fp >> prestamos[r][c];
        }
        fp.close();
    } else {
        cout << "Unable to open file prestamos.dat (se empieza sin prestamos)\n";
    }
}

// ---------- Libros ----------
void mostrar_libro(int i) {
    cout << "  #" << libro_id[i] << "  "
         << rellenar(libro_titulo[i], 28)
         << rellenar(libro_autor[i], 20)
         << rellenar(libro_categoria[i], 14)
         << "disponibles: " << libro_existencias[i] << "\n";
}

void buscar_libros() {
    cout << "1) Por titulo   2) Por autor\n";
    int op = leer_entero("Opcion: ", 1, 2);
    string texto = leer_texto("Texto a buscar (vacio = todos): ");
    int hallados = 0;
    for (int i = 0; i < num_libros; i++) {
        string campo;
        if (op == 1) campo = libro_titulo[i];
        else campo = libro_autor[i];
        if (contiene(campo, texto)) {
            mostrar_libro(i);
            hallados++;
        }
    }
    if (hallados == 0) cout << "  Sin resultados.\n";
}

void alta_libro() {
    if (num_libros >= MAX_LIBROS) {
        cout << "  El catalogo esta lleno.\n";
        return;
    }
    string t = leer_campo("Titulo: ");
    if (buscar_libro_titulo(t) != -1) {
        cout << "  Ya existe un libro con ese titulo.\n";
        return;
    }
    ultimo_id_libro++;
    libro_id[num_libros] = ultimo_id_libro;
    libro_titulo[num_libros] = t;
    libro_autor[num_libros] = leer_campo("Autor: ");
    libro_categoria[num_libros] = leer_campo("Categoria: ");
    libro_existencias[num_libros] = leer_entero("Existencias: ", 0, 9999);
    num_libros++;
    cout << "  Libro dado de alta con id " << ultimo_id_libro << ".\n";
}

void baja_libro() {
    int l = pedir_libro();
    if (l == -1) return;
    if (copias_prestadas(libro_id[l]) > 0) {
        cout << "  No se puede dar de baja: hay copias prestadas.\n";
        return;
    }
    for (int i = l; i < num_libros - 1; i++) {   // recorre hacia la izquierda
        libro_id[i] = libro_id[i + 1];
        libro_titulo[i] = libro_titulo[i + 1];
        libro_autor[i] = libro_autor[i + 1];
        libro_categoria[i] = libro_categoria[i + 1];
        libro_existencias[i] = libro_existencias[i + 1];
    }
    num_libros--;
    cout << "  Libro dado de baja.\n";
}

void modificar_libro() {
    int l = pedir_libro();
    if (l == -1) return;
    cout << "1) Titulo  2) Autor  3) Categoria  4) Existencias totales\n";
    int op = leer_entero("Campo a modificar: ", 1, 4);
    if (op == 1) {
        string t = leer_campo("Nuevo titulo: ");
        int otro = buscar_libro_titulo(t);
        if (otro != -1 && otro != l) {
            cout << "  Ya existe ese titulo.\n";
            return;
        }
        libro_titulo[l] = t;
    } else if (op == 2) {
        libro_autor[l] = leer_campo("Nuevo autor: ");
    } else if (op == 3) {
        libro_categoria[l] = leer_campo("Nueva categoria: ");
    } else {
        // Las existencias guardadas son las disponibles: el total nuevo debe cubrir lo prestado
        int total = leer_entero("Nuevas existencias totales: ", 0, 9999);
        int prestadas = copias_prestadas(libro_id[l]);
        if (total < prestadas) {
            cout << "  No puede ser menor que las " << prestadas << " copias prestadas.\n";
            return;
        }
        libro_existencias[l] = total - prestadas;
    }
    cout << "  Libro modificado.\n";
}

// ---------- Usuarios ----------
void registrar_usuario() {
    if (num_usuarios >= MAX_USUARIOS) {
        cout << "  No hay espacio para mas usuarios.\n";
        return;
    }
    string nombre = leer_campo("Nombre: ");
    ultimo_id_usuario++;
    usuario_id[num_usuarios] = ultimo_id_usuario;
    usuario_nombre[num_usuarios] = nombre;
    usuario_multa[num_usuarios] = 0;
    num_usuarios++;
    cout << "  Registrado. Su id es " << ultimo_id_usuario << " (guardelo).\n";
}

void ver_historial() {
    int u = pedir_usuario();
    if (u == -1) return;
    cout << "  Historial de " << usuario_nombre[u] << ":\n";
    int n = 0;
    for (int r = 0; r < num_prestamos; r++) {
        if (prestamos[r][COL_USUARIO] == usuario_id[u]) {
            int l = buscar_libro_id(prestamos[r][COL_LIBRO]);
            string titulo = "(libro eliminado)";
            if (l != -1) titulo = libro_titulo[l];
            cout << "  " << rellenar(titulo, 28);
            if (prestamos[r][COL_DEVOL] == 0) {
                cout << "  [ACTIVO]";
            } else {
                cout << "  devuelto  multa $" << prestamos[r][COL_MULTA];
            }
            cout << "\n";
            n++;
        }
    }
    if (n == 0) cout << "  Sin prestamos.\n";
    cout << "  Libros activos: " << activos_de(usuario_id[u]) << " de " << LIMITE_LIBROS
         << ". Multa pendiente: $" << usuario_multa[u] << "\n";
}

void pagar_multa() {
    int u = pedir_usuario();
    if (u == -1) return;
    if (usuario_multa[u] == 0) {
        cout << "  No tiene multas pendientes.\n";
        return;
    }
    cout << "  Multa pendiente: $" << usuario_multa[u] << "\n";
    usuario_multa[u] = 0;
    cout << "  Multa pagada.\n";
}

void baja_usuario() {
    int u = pedir_usuario();
    if (u == -1) return;
    if (activos_de(usuario_id[u]) > 0) {
        cout << "  Tiene libros sin devolver.\n";
        return;
    }
    if (usuario_multa[u] > 0) {
        cout << "  Tiene multas pendientes.\n";
        return;
    }
    for (int i = u; i < num_usuarios - 1; i++) {
        usuario_id[i] = usuario_id[i + 1];
        usuario_nombre[i] = usuario_nombre[i + 1];
        usuario_multa[i] = usuario_multa[i + 1];
    }
    num_usuarios--;
    cout << "  Usuario dado de baja.\n";
}

void modificar_usuario() {
    int u = pedir_usuario();
    if (u == -1) return;
    usuario_nombre[u] = leer_campo("Nuevo nombre: ");
    cout << "  Usuario modificado.\n";
}

// ---------- Préstamos ----------
void prestar_libro() {
    if (num_prestamos >= MAX_PRESTAMOS) {
        cout << "  La matriz de prestamos esta llena.\n";
        return;
    }
    int u = pedir_usuario();
    if (u == -1) return;
    int l = pedir_libro();
    if (l == -1) return;
    if (usuario_multa[u] > 0) {
        cout << "  Tiene una multa de $" << usuario_multa[u] << " pendiente.\n";
        return;
    }
    if (activos_de(usuario_id[u]) >= LIMITE_LIBROS) {
        cout << "  Ya tiene " << LIMITE_LIBROS << " libros (limite).\n";
        return;
    }
    if (libro_existencias[l] == 0) {
        cout << "  No hay copias disponibles.\n";
        return;
    }

    int r = num_prestamos;
    num_prestamos++;
    prestamos[r][COL_LIBRO] = libro_id[l];
    prestamos[r][COL_USUARIO] = usuario_id[u];
    prestamos[r][COL_DEVOL] = 0;
    prestamos[r][COL_MULTA] = 0;
    libro_existencias[l]--;
    cout << "  Prestamo registrado. Tiene " << DIAS_PRESTAMO << " dias para devolverlo.\n";
}

void devolver_libro() {
    int u = pedir_usuario();
    if (u == -1) return;
    int l = pedir_libro();
    if (l == -1) return;
    int r = fila_activa(libro_id[l], usuario_id[u]);
    if (r == -1) {
        cout << "  Ese usuario no tiene ese libro prestado.\n";
        return;
    }

    int dias = leer_entero("Dias que lleva prestado el libro: ", 0, 3650);
    int atraso = dias - DIAS_PRESTAMO;
    int multa = 0;
    if (atraso > 0) multa = atraso * MULTA_POR_DIA;
    prestamos[r][COL_DEVOL] = 1;
    prestamos[r][COL_MULTA] = multa;
    usuario_multa[u] += multa;
    libro_existencias[l]++;

    if (multa > 0) {
        cout << "  Devuelto con " << atraso << " dias de retraso. Multa: $" << multa << "\n";
    } else {
        cout << "  Devuelto a tiempo.\n";
    }
}

// ---------- Reportes ----------
void reporte_mas_prestados() {
    int orden[MAX_LIBROS], veces[MAX_LIBROS];
    for (int i = 0; i < num_libros; i++) {
        orden[i] = i;
        veces[i] = veces_prestado(libro_id[i]);
    }
    // Ordena de mayor a menor (burbuja)
    for (int i = 0; i < num_libros - 1; i++) {
        for (int j = 0; j < num_libros - 1 - i; j++) {
            if (veces[orden[j]] < veces[orden[j + 1]]) {
                int tmp = orden[j];
                orden[j] = orden[j + 1];
                orden[j + 1] = tmp;
            }
        }
    }

    cout << "  LIBROS MAS PRESTADOS (cada X = un prestamo)\n";
    int mostrados = 0;
    for (int k = 0; k < num_libros && k < 10; k++) {
        int i = orden[k];
        if (veces[i] > 0) {
            cout << "  " << rellenar(libro_titulo[i], 28);
            for (int x = 0; x < veces[i]; x++) cout << 'X';
            cout << " (" << veces[i] << ")\n";
            mostrados++;
        }
    }
    if (mostrados == 0) cout << "  Aun no hay prestamos.\n";
}

void reporte_multas() {
    cout << "  USUARIOS CON MULTAS\n";
    int n = 0;
    for (int u = 0; u < num_usuarios; u++) {
        if (usuario_multa[u] > 0) {
            cout << "  #" << usuario_id[u] << "  "
                 << rellenar(usuario_nombre[u], 25) << "$" << usuario_multa[u] << "\n";
            n++;
        }
    }
    if (n == 0) cout << "  Ninguno.\n";
}

void reporte_alfabetico() {
    int orden[MAX_LIBROS];
    for (int i = 0; i < num_libros; i++) orden[i] = i;
    for (int i = 0; i < num_libros - 1; i++) {
        for (int j = 0; j < num_libros - 1 - i; j++) {
            if (minusculas(libro_titulo[orden[j]]) > minusculas(libro_titulo[orden[j + 1]])) {
                int tmp = orden[j];
                orden[j] = orden[j + 1];
                orden[j + 1] = tmp;
            }
        }
    }
    cout << "  LIBROS EN ORDEN ALFABETICO\n";
    for (int k = 0; k < num_libros; k++) mostrar_libro(orden[k]);
    if (num_libros == 0) cout << "  El catalogo esta vacio.\n";
}

void menu_reportes() {
    while (true) {
        cout << "\n--- REPORTES ---\n";
        cout << "1) Libros mas prestados (grafica con X)\n";
        cout << "2) Usuarios con multas\n";
        cout << "3) Libros en orden alfabetico\n";
        cout << "0) Volver\n";
        int op = leer_entero("Opcion: ", 0, 3);
        if (op == 0) return;
        if (op == 1) reporte_mas_prestados();
        else if (op == 2) reporte_multas();
        else reporte_alfabetico();
    }
}

// ---------- Administrador ----------
void menu_admin() {
    if (leer_texto("Clave de administrador: ") != CLAVE_ADMIN) {
        cout << "  Clave incorrecta.\n";
        return;
    }
    while (true) {
        cout << "\n--- ADMINISTRADOR ---\n";
        cout << "1) Alta de libro\n";
        cout << "2) Baja de libro\n";
        cout << "3) Modificar libro\n";
        cout << "4) Baja de usuario\n";
        cout << "5) Modificar usuario\n";
        cout << "0) Volver\n";
        int op = leer_entero("Opcion: ", 0, 5);
        if (op == 0) return;
        if (op == 1) alta_libro();
        else if (op == 2) baja_libro();
        else if (op == 3) modificar_libro();
        else if (op == 4) baja_usuario();
        else modificar_usuario();
    }
}

// ---------- Programa principal ----------
int main() {
    cargar_todo();
    while (true) {
        cout << "\n=== BIBLIOTECA ===\n";
        cout << "1) Buscar libro\n";
        cout << "2) Registrar usuario\n";
        cout << "3) Prestar libro\n";
        cout << "4) Devolver libro\n";
        cout << "5) Historial de usuario\n";
        cout << "6) Pagar multa\n";
        cout << "7) Reportes\n";
        cout << "8) Administrador\n";
        cout << "0) Salir\n";
        int op = leer_entero("Opcion: ", 0, 8);
        if (op == 0) break;
        if (op == 1) buscar_libros();
        else if (op == 2) registrar_usuario();
        else if (op == 3) prestar_libro();
        else if (op == 4) devolver_libro();
        else if (op == 5) ver_historial();
        else if (op == 6) pagar_multa();
        else if (op == 7) menu_reportes();
        else menu_admin();
        guardar_todo();   // guarda después de cada acción: no se pierde nada si se cierra mal
    }
    guardar_todo();
    cout << "Hasta luego.\n";
    return 0;
}
