from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Colonia, Campana, Gato
from fastapi.responses import FileResponse, JSONResponse
import os
import io
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image

router = APIRouter()

def generar_pdf_colonias(colonias):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    # Título del informe
    elements.append(Paragraph("📄 Informe General de Colonias", styles['Title']))
    elements.append(Spacer(1, 12))

    for colonia in colonias:
        # Encabezado de cada colonia
        elements.append(Paragraph(f"<b>ID:</b> {colonia.id} | <b>Nombre:</b> {colonia.nombre} | "
                                  f"<b>Ubicación:</b> {colonia.ubicacion} | <b>Número de Gatos:</b> {colonia.numero_gatos} "
                                  f"| <b>Responsable:</b> {colonia.responsable_voluntario}", styles['Heading3']))
        elements.append(Spacer(1, 6))

        # Datos de los gatos en tabla
        data = [["ID", "Nombre", "Salud", "Adoptabilidad", "Estado", "Vacunación","Microchip"]]
        gatos = colonia.gatos
        for gato in gatos:
            estado = "Activo" if gato.activo else "Inactivo"
            data.append([gato.id, gato.nombre, gato.estado_salud, gato.adoptabilidad, estado, gato.fecha_vacunacion, gato.codigo_identificacion])

        table = Table(data, colWidths=[40, 80, 60, 80, 60, 80, 90])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))

        elements.append(table)
        elements.append(Spacer(1, 12))

    doc.build(elements)
    buffer.seek(0)
    return buffer

def generar_grafico_colonias(colonias):
    nombres = [colonia.nombre for colonia in colonias]
    cantidades = [len(colonia.gatos) for colonia in colonias]

    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.barh(nombres, cantidades, color="#4a90e2", edgecolor="#333")

    # Agregar etiquetas al final de cada barra
    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.2, bar.get_y() + bar.get_height()/2,
                f"{int(width)}", va='center', fontsize=10)

    ax.set_xlabel("Número de Gatos")
    ax.set_title("Gatos por Colonia", fontsize=14, weight='bold')
    ax.grid(True, axis='x', linestyle='--', alpha=0.5)
    plt.tight_layout()

    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    plt.close()
    return buffer


def generar_pdf_con_grafico(colonias):
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(pdf_buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("📊 Informe Visual: Gatos por Colonia", styles['Title']))
    elements.append(Spacer(1, 12))

    grafico_buffer = generar_grafico_colonias(colonias)
    imagen = Image(grafico_buffer, width=500, height=300)
    elements.append(imagen)

    doc.build(elements)
    pdf_buffer.seek(0)
    return pdf_buffer

@router.get("/informes/colonias")
def informe_colonias(db: Session = Depends(get_db)):
    colonias = db.query(Colonia).all()
    if not colonias:
        raise HTTPException(status_code=404, detail="No hay colonias registradas")

    pdf_buffer = generar_pdf_colonias(colonias)
    file_path = "informe_colonias.pdf"
    with open(file_path, "wb") as f:
        f.write(pdf_buffer.read())

    return FileResponse(file_path, media_type="application/pdf", filename="informe_colonias.pdf")

# Informe de campañas
@router.get("/informes/campanas")
def informe_campanas(db: Session = Depends(get_db)):
    campanas = db.query(Campana).all()
    if not campanas:
        raise HTTPException(status_code=404, detail="No hay campañas registradas")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph("📄 Informe de Campañas de Esterilización", styles['Title']))
    elements.append(Spacer(1, 12))

    for campana in campanas:
        elements.append(Paragraph(f"<b>ID:</b> {campana.id} | <b>Nombre:</b> {campana.nombre} | "
                                  f"<b>Inicio:</b> {campana.fecha_inicio} | <b>Fin:</b> {campana.fecha_fin} | "
                                  f"<b>Gatos Objetivo:</b> {campana.gatos_objetivo} | <b>Gatos Esterilizados:</b> {campana.gatos_esterilizados} "
                                  f"| <b>Estatus:</b> {campana.estatus}", styles['Heading3']))
        elements.append(Spacer(1, 6))

        data = [["ID", "Nombre", "Salud", "Estado", "Vacunación", "Esterilización"]]
        gatos = campana.gatos
        for gato in gatos:
            estado = "Activo" if gato.activo else "Inactivo"
            data.append([gato.id, gato.nombre, gato.estado_salud, estado, gato.fecha_vacunacion, gato.fecha_esterilizacion])

        table = Table(data, colWidths=[40, 80, 60, 60, 80, 80])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))

        elements.append(table)
        elements.append(Spacer(1, 12))

    doc.build(elements)
    buffer.seek(0)
    file_path = "informe_campanas.pdf"
    with open(file_path, "wb") as f:
        f.write(buffer.read())

    return FileResponse(file_path, media_type="application/pdf", filename="informe_campanas.pdf")

# Informe visual adicional: Gatos por Colonia
@router.get("/informes/graficos/colonias")
def informe_visual_colonias_grafico(db: Session = Depends(get_db)):
    colonias = db.query(Colonia).all()
    if not colonias:
        raise HTTPException(status_code=404, detail="No hay colonias registradas")

    pdf_buffer = generar_pdf_con_grafico(colonias)
    file_path = "informe_graficos_colonias.pdf"
    with open(file_path, "wb") as f:
        f.write(pdf_buffer.read())

    return FileResponse(file_path, media_type="application/pdf", filename="informe_graficos_colonias.pdf")

# Nuevo endpoint para frontend (datos JSON para gráficos)
@router.get("/informes/datos/colonias")
def datos_gatos_por_colonia(db: Session = Depends(get_db)):
    colonias = db.query(Colonia).all()
    if not colonias:
        raise HTTPException(status_code=404, detail="No hay colonias registradas")

    datos = [
        {"colonia": colonia.nombre, "gatos": len(colonia.gatos)}
        for colonia in colonias
    ]
    return JSONResponse(content=datos)