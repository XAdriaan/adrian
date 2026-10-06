# ==========================================================
# JJM ProjectSphere AI / Oficina de Proyectos
# Imagen de producción: Spring Boot + frontend estático
# Java 21
# ==========================================================

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Primero se copia el POM para aprovechar la caché de dependencias.
COPY backend/pom.xml backend/pom.xml
RUN cd backend && mvn -B -DskipTests dependency:go-offline

# El POM incorpora ../frontend dentro del JAR en /static.
COPY backend backend
COPY frontend frontend
RUN cd backend && mvn -B -DskipTests clean package

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Usuario sin privilegios para ejecutar la aplicación.
RUN addgroup -S jjm && adduser -S jjm -G jjm
RUN mkdir -p /app/grabaciones && chown jjm:jjm /app/grabaciones

COPY --from=build /app/backend/target/oficina-proyectos-backend-1.0.0.jar /app/app.jar

USER jjm
EXPOSE 8080

ENV SERVER_PORT=8080 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -Dfile.encoding=UTF-8"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
