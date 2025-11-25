FROM node:16

# Configura el directorio de trabajo en el contenedor
WORKDIR /app

# Copia los archivos de package.json y package-lock.json
COPY package.json package-lock.json ./

# Instala las dependencias de Node.js
RUN npm install --legacy-peer-deps

# Copia todo el contenido del directorio `frontend` (incluyendo `public` y `src`)
COPY . .

# Compila y ofusca el proyecto
RUN npm run secure-build

# Reemplaza la carpeta original build/ con la versión ofuscada
RUN rm -rf build

# Expone el puerto 3000 para la aplicación React
EXPOSE 3000

# Comando para iniciar la aplicación React (si es app de desarrollo)
CMD ["npm", "start"]
