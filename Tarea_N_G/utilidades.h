// utilidades.h - Nuestra propia librería de funciones auxiliares.
// Solo funciones básicas (sin clases). Se usa con #include "utilidades.h".
// Compatible con C++98 (Dev-C++ / TDM-GCC).
#ifndef UTILIDADES_H
#define UTILIDADES_H

#include <iostream>
#include <string>
#include <cstdlib>
using namespace std;

// Lee una línea completa y quita espacios al inicio y al final.
// Si la entrada se cerró (Ctrl+Z / Ctrl+D), termina el programa.
// No se pierde nada: los datos se guardan después de cada acción.
string leer_texto(string mensaje) {
    cout << mensaje;
    string s;
    if (!getline(cin, s)) {
        cout << "\nFin de la entrada.\n";
        exit(0);
    }
    int ini = 0;
    while (ini < (int)s.length() && s[ini] == ' ') ini++;
    int fin = (int)s.length() - 1;
    while (fin >= ini && s[fin] == ' ') fin--;
    return s.substr(ini, fin - ini + 1);
}

// Lee un entero entre min y max. Repite la pregunta hasta que sea válido.
int leer_entero(string mensaje, int min, int max) {
    while (true) {
        string s = leer_texto(mensaje);
        int largo = s.length();
        bool valido = (largo > 0 && largo <= 9);
        for (int i = 0; i < largo; i++) {
            if (s[i] < '0' || s[i] > '9') valido = false;
        }
        if (valido) {
            int n = 0;
            for (int i = 0; i < largo; i++) n = n * 10 + (s[i] - '0');
            if (n >= min && n <= max) return n;
        }
        cout << "  Valor no valido. Escriba un numero entre " << min << " y " << max << ".\n";
    }
}

// Convierte un texto a minúsculas (para comparar sin importar mayúsculas)
string minusculas(string s) {
    for (int i = 0; i < (int)s.length(); i++) {
        if (s[i] >= 'A' && s[i] <= 'Z') s[i] = s[i] - 'A' + 'a';
    }
    return s;
}

// true si 'busca' aparece dentro de 'texto' (sin distinguir mayúsculas)
bool contiene(string texto, string busca) {
    return minusculas(texto).find(minusculas(busca)) != string::npos;
}

// Rellena con espacios hasta 'ancho' caracteres (para alinear columnas)
string rellenar(string s, int ancho) {
    while ((int)s.length() < ancho) s += ' ';
    return s;
}

// Cambia cada espacio (y tabulador) por '_' para guardar textos con >>
string espacios_a_guion(string s) {
    for (int i = 0; i < (int)s.length(); i++) {
        if (s[i] == ' ' || s[i] == '\t') s[i] = '_';
    }
    return s;
}

// Cambia cada '_' por espacio al leer el archivo (inverso de espacios_a_guion)
string guion_a_espacios(string s) {
    for (int i = 0; i < (int)s.length(); i++) {
        if (s[i] == '_') s[i] = ' ';
    }
    return s;
}

#endif
