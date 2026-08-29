"""
ONEHEALTH AI - Comprehensive PDF Documentation Generator
Creates a professional, multi-page, formatted PDF detailing:
- Executive Summary & Rural Problem Statement
- System Architecture & Data Flow
- Algorithms & Diagnostic Logic (Human, Child, Livestock)
- Offline Storage (IndexedDB) & Sync Protocol
- Multilingual & Accessibility Engine
- Professional Doctor & Vet Portal
- Project Directory Structure & File Reference
- Step-by-Step Installation, Running, and Testing Guide
"""

import os
import sys
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and display 'Page X of Y'"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Skip header/footer on cover page
            return
        
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header
        self.drawString(54, 800, "ONEHEALTH AI — Rural Offline-First Healthcare & Veterinary Platform")
        self.drawRightString(558, 800, "Comprehensive Technical & Operations Guide")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 792, 558, 792)

        # Footer
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Kopargaon Rural Health & Veterinary Tele-Triage Network")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()


def build_pdf(filename="ONEHEALTH_AI_COMPREHENSIVE_DOCUMENTATION.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#059669")     # Emerald Green
    PRIMARY_DARK = colors.HexColor("#064e3b")
    SECONDARY = colors.HexColor("#0284c7")   # Sky Blue
    ACCENT_RED = colors.HexColor("#ef4444")
    ACCENT_ORANGE = colors.HexColor("#f97316")
    DARK_BG = colors.HexColor("#0f172a")
    LIGHT_BG = colors.HexColor("#f8fafc")
    BORDER_COLOR = colors.HexColor("#e2e8f0")
    TEXT_MAIN = colors.HexColor("#1e293b")
    TEXT_MUTED = colors.HexColor("#64748b")

    # Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=PRIMARY_DARK,
        alignment=TA_CENTER
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=TEXT_MUTED,
        alignment=TA_CENTER
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=PRIMARY_DARK,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_MAIN,
        alignment=TA_LEFT,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white,
        alignment=TA_CENTER
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_MAIN
    )

    story = []

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 40))
    
    # Header Banner Box
    cover_box = [
        [Paragraph("<b>🌱 ONEHEALTH AI</b>", ParagraphStyle('B1', fontName='Helvetica-Bold', fontSize=26, textColor=colors.HexColor("#059669"), alignment=TA_CENTER))],
        [Paragraph("<b>Unified Offline-First AI Screening & Care Platform</b><br/><font color='#64748b' size='11'>Bridging Human Health (General & Child Development) & Livestock Veterinary Care</font>", ParagraphStyle('B2', fontName='Helvetica', fontSize=12, leading=16, alignment=TA_CENTER))],
        [Paragraph("<font color='#0284c7'><b>Tailored for Rural Communities & Primary Healthcare Centers (Kopargaon, Maharashtra)</b></font>", ParagraphStyle('B3', fontName='Helvetica-Bold', fontSize=10, alignment=TA_CENTER))]
    ]
    cover_table = Table(cover_box, colWidths=[500])
    cover_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0fdf4")),
        ('BOX', (0,0), (-1,-1), 1.5, PRIMARY),
        ('PADDING', (0,0), (-1,-1), 14),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BOTTOMPADDING', (0,1), (-1,1), 8),
    ]))
    story.append(cover_table)

    story.append(Spacer(1, 25))

    # Meta info table
    meta_data = [
        [Paragraph("<b>Document Version:</b>", body_style), Paragraph("1.0.0 (Production Release)", body_style)],
        [Paragraph("<b>Target Stack:</b>", body_style), Paragraph("HTML5, CSS3, ES6+ Vanilla JS, IndexedDB, Service Worker, FastAPI, SQLite/PostgreSQL", body_style)],
        [Paragraph("<b>Target Deployment:</b>", body_style), Paragraph("Mobile-First Progressive Web App (PWA) + REST Backend", body_style)],
        [Paragraph("<b>Target Users:</b>", body_style), Paragraph("ASHA Workers, ANM Nurses, Medical Officers (MBBS/MD), Veterinary Surgeons (BVSc), Rural Farmers & Citizens", body_style)],
        [Paragraph("<b>Offline Capability:</b>", body_style), Paragraph("100% Autonomous (Forms, Local AI Triage, Image Store, Sync Queue)", body_style)],
        [Paragraph("<b>Languages:</b>", body_style), Paragraph("English, Marathi (मराठी), Hindi (हिंदी) with Speech Assist", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[150, 350])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 25))

    # Executive Overview
    story.append(Paragraph("<b>EXECUTIVE SUMMARY</b>", h2_style))
    story.append(Paragraph(
        "Rural communities such as Kopargaon face a twin structural crisis: a severe shortage of qualified medical doctors, pediatricians, and veterinary surgeons, paired with intermittent or non-existent cellular internet connectivity. Delays in screening common febrile illnesses, severe acute malnutrition (SAM) in under-5 children, or contagious epizootics (like Lumpy Skin Disease or Foot & Mouth Disease in dairy cattle) lead to preventable mortality, stunted development, and catastrophic economic loss for agrarian households.",
        body_style
    ))
    story.append(Paragraph(
        "<b>ONEHEALTH AI</b> is a production-grade, mobile-first Progressive Web Application (PWA) that empowers community health workers (ASHA/ANM) and livestock owners to perform comprehensive clinical and veterinary screening directly in the field—<b>entirely offline</b>. Using autonomous client-side expert decision engines, native IndexedDB persistence, WHO growth standard algorithms, and background queue synchronization, ONEHEALTH AI ensures uninterrupted care delivery regardless of network status.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 1: ARCHITECTURE & DATA FLOW
    # =========================================================================
    story.append(Paragraph("1. System Architecture & Component Design", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))
    story.append(Paragraph(
        "The system employs a client-heavy, zero-friction edge architecture. The frontend is built with pure HTML5, CSS3, and ES6+ JavaScript, requiring no heavy client bundles or compilation. The backend is an asynchronous Python FastAPI service capable of running on edge servers or cloud infrastructure.",
        body_style
    ))

    arch_rows = [
        [Paragraph("<b>Component Layer</b>", table_header_style), Paragraph("<b>Technologies Used</b>", table_header_style), Paragraph("<b>Core Responsibilities</b>", table_header_style)],
        [
            Paragraph("<b>Mobile PWA UI</b>", table_cell_style),
            Paragraph("HTML5, CSS3, ES6+ JS, Manifest, ServiceWorker", table_cell_style),
            Paragraph("Mobile-first ergonomic interface, bottom touch navigation, speech TTS/STT, camera capture, multilingual DOM switching.", table_cell_style)
        ],
        [
            Paragraph("<b>Offline Client AI</b>", table_cell_style),
            Paragraph("OneHealthAIEngine (Pure JS)", table_cell_style),
            Paragraph("Autonomous offline screening for adult vitals, WHO pediatric growth Z-scores, milestone delays, and livestock disease matrices.", table_cell_style)
        ],
        [
            Paragraph("<b>Offline DB Layer</b>", table_cell_style),
            Paragraph("IndexedDB (OneHealthDB)", table_cell_style),
            Paragraph("Stores cases, sync queue, compressed image blobs, community outbreak alerts, and local preferences.", table_cell_style)
        ],
        [
            Paragraph("<b>Sync Manager</b>", table_cell_style),
            Paragraph("OneHealthSyncEngine", table_cell_style),
            Paragraph("Monitors network states (online/offline), performs batch push to /api/sync/batch and pulls server doctor reviews/alerts.", table_cell_style)
        ],
        [
            Paragraph("<b>Backend API</b>", table_cell_style),
            Paragraph("FastAPI, Uvicorn, Pydantic v2", table_cell_style),
            Paragraph("RESTful endpoints (/api/cases, /api/sync, /api/professionals, /api/analytics), CORS, validation, static file server.", table_cell_style)
        ],
        [
            Paragraph("<b>Database</b>", table_cell_style),
            Paragraph("SQLAlchemy (SQLite / PostgreSQL)", table_cell_style),
            Paragraph("Relational storage for Users, Cases, Clinical Reviews, Outbreak Alerts, and Device Sync Logs.", table_cell_style)
        ],
        [
            Paragraph("<b>Professional Portal</b>", table_cell_style),
            Paragraph("Responsive Web View", table_cell_style),
            Paragraph("Doctor (MBBS) & Vet (BVSc) tele-triage dashboard, risk verification, prescription submission, printable referral slips.", table_cell_style)
        ]
    ]
    arch_table = Table(arch_rows, colWidths=[110, 140, 250])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(arch_table)

    story.append(Spacer(1, 12))

    # Architecture Flow Diagram in code/text box
    story.append(Paragraph("<b>End-to-End Data Flow Diagram:</b>", h2_style))
    flow_diagram = (
        "  +-------------------------------------------------------------------------+\n"
        "  |                       FIELD MOBILE USER / WORKER                        |\n"
        "  |    [Enter Symptoms / Vitals]  ->  [Capture Lesion Photo]  ->  [Voice]   |\n"
        "  +------------------------------------+------------------------------------+\n"
        "                                       |\n"
        "                                       v\n"
        "  +-------------------------------------------------------------------------+\n"
        "  |                 OFFLINE CLIENT-SIDE AI ENGINE (ai-engine.js)            |\n"
        "  |  * Adult Vitals & Shock Index      * WHO Pediatric Growth Z-Scores (SAM)|\n"
        "  |  * Endemic Fever Matrix (Dengue)   * Livestock Disease Rules (LSD, FMD) |\n"
        "  +------------------------------------+------------------------------------+\n"
        "                                       |\n"
        "                     +-----------------+-----------------+\n"
        "                     |                                   |\n"
        "                     v                                   v\n"
        "  +------------------------------------+   +--------------------------------+\n"
        "  |      INDEXEDDB (db.js)             |   |   IMMEDIATE SCREENING RESULT   |\n"
        "  |  - 'cases' store (offline copy)    |   |  - Risk Color (Red/Orange/etc.)|\n"
        "  |  - 'sync_queue' (pending items)    |   |  - Clinical Care Advice        |\n"
        "  |  - 'media_blobs' (photos)          |   |  - Referral Notice             |\n"
        "  +------------------+-----------------+   +--------------------------------+\n"
        "                     |\n"
        "           (When Internet Reconnects)\n"
        "                     v\n"
        "  +-------------------------------------------------------------------------+\n"
        "  |               BACKGROUND SYNC ENGINE (sync.js -> /api/sync/batch)       |\n"
        "  |    Uploads Queued Cases/Reviews  <=====>  Pulls Doctor Notes & Alerts   |\n"
        "  +------------------------------------+------------------------------------+\n"
        "                                       |\n"
        "                     +-----------------+-----------------+\n"
        "                     |                                   |\n"
        "                     v                                   v\n"
        "  +------------------------------------+   +--------------------------------+\n"
        "  |     CENTRAL DATABASE & BACKEND     |   |   PROFESSIONAL PORTAL          |\n"
        "  |  - Case History & Analytics        |   |  - Doctor Triage Queue (MBBS)  |\n"
        "  |  - Epidemic Heatmaps & Alerts      |   |  - Veterinary Officer Queue    |\n"
        "  +------------------------------------+   +--------------------------------+"
    )
    story.append(Paragraph(flow_diagram.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_style))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 2: SCREENING MODULES & ALGORITHMS
    # =========================================================================
    story.append(Paragraph("2. Screening Modules & Clinical Logic", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    # A. Human General
    story.append(Paragraph("A. Human General Health Triage Algorithm", h2_style))
    story.append(Paragraph(
        "Evaluates vital signs, critical red flags, and endemic differential symptoms to compute an instantaneous risk tier (GREEN, YELLOW, ORANGE, RED).",
        body_style
    ))
    story.append(Paragraph("<b>1. Emergency Red Flags (Immediate RED Escalation):</b> Severe crushing chest pain radiating to arm/jaw, sudden unilateral weakness or slurred speech (FAST stroke sign), severe resting breathlessness, altered sensorium/drowsiness, severe stiff neck with photophobia (meningism).", bullet_style))
    story.append(Paragraph("<b>2. Vitals & Shock Index:</b> Shock Index = Heart Rate / Systolic BP. If Shock Index >= 1.0 with Systolic BP < 90 mmHg, flags immediate Haemodynamic Shock (RED). Hypoxemia is graded into Severe (SpO2 < 90% -> RED) and Moderate (SpO2 90-93% -> ORANGE). Hypertensive Crisis is triggered if BP >= 180/120 mmHg.", bullet_style))
    story.append(Paragraph("<b>3. Differential Endemic Matrix:</b> Weighs co-occurring symptom clusters for Dengue (retro-orbital headache + petechial rash + high fever), Malaria (paroxysmal rigors/chills + sweats), Typhoid (step-ladder fever + coated tongue), Pulmonary TB (productive cough >2 weeks + night sweats + weight loss), Gastroenteritis, and Uncontrolled Diabetes (RBS >200 mg/dL + non-healing ulcer).", bullet_style))

    story.append(Spacer(1, 8))

    # B. Child Development
    story.append(Paragraph("B. Childhood Growth & WHO Developmental Milestones (0-5 Years)", h2_style))
    story.append(Paragraph(
        "Incorporates World Health Organization (WHO) Growth Standards and a 4-domain milestone developmental tracker.",
        body_style
    ))
    story.append(Paragraph("<b>1. Anthropometric Z-Score Formulas:</b> Computes Weight-for-Age (WAZ), Height-for-Age (HAZ), and Weight-for-Height (WHZ) relative to WHO median reference curves.", bullet_style))
    story.append(Paragraph("<b>2. Severe Acute Malnutrition (SAM) Detector:</b> Triggered (RED) if: (a) Mid-Upper Arm Circumference (MUAC) < 11.5 cm, OR (b) WHZ < -3.0 SD, OR (c) Bilateral pitting pedal edema (Kwashiorkor) is present. Immediately recommends Nutritional Rehabilitation Centre (NRC) referral.", bullet_style))
    story.append(Paragraph("<b>3. Moderate Acute Malnutrition (MAM):</b> Triggered (ORANGE) if MUAC is 11.5 - 12.5 cm or WHZ is -2.0 to -3.0 SD. Enrolls child into supplementary nutrition take-home ration.", bullet_style))
    story.append(Paragraph("<b>4. 4-Domain Milestone Tracking:</b> Evaluates Gross Motor, Fine Motor, Language/Communication, and Social/Cognitive domains. If >=2 domains exhibit delay, flags Global Developmental Delay and routes to District Early Intervention Centre (DEIC).", bullet_style))

    story.append(Spacer(1, 8))

    # C. Livestock & Veterinary
    story.append(Paragraph("C. Livestock & Veterinary Health Screening Algorithm", h2_style))
    story.append(Paragraph(
        "Supports Cattle, Buffalo, Goat, Sheep, and Poultry with species-specific rectal temperature baselines and syndromic matrices.",
        body_style
    ))

    vet_rows = [
        [Paragraph("<b>Target Disease</b>", table_header_style), Paragraph("<b>Key Symptoms & Indicators</b>", table_header_style), Paragraph("<b>Triage Risk</b>", table_header_style), Paragraph("<b>Biosecurity / Clinical Action</b>", table_header_style)],
        [
            Paragraph("<b>Lumpy Skin Disease (LSD)</b>", table_cell_style),
            Paragraph("Cutaneous firm nodules (2-5cm), high fever (>104°F), milk yield crash >80%, leg edema, enlarged prescapular lymph nodes.", table_cell_style),
            Paragraph("<font color='#ef4444'><b>RED</b></font>", table_cell_style),
            Paragraph("Strict quarantine of animal, neem oil fly repellent, notify Taluka Vet Dispensary.", table_cell_style)
        ],
        [
            Paragraph("<b>Foot & Mouth Disease (FMD)</b>", table_cell_style),
            Paragraph("Profuse ropy salivation, vesicles/blisters on gums & tongue, interdigital sores, severe lameness.", table_cell_style),
            Paragraph("<font color='#ef4444'><b>RED</b></font>", table_cell_style),
            Paragraph("Herd isolation, KMnO4 1% mouth wash, boro-glycerine on ulcers, hoof antiseptic spray.", table_cell_style)
        ],
        [
            Paragraph("<b>Acute Mastitis</b>", table_cell_style),
            Paragraph("Hard, hot, swollen udder quarter, milk containing clots/flakes/blood, CMT test positive.", table_cell_style),
            Paragraph("<font color='#f97316'><b>ORANGE</b></font>", table_cell_style),
            Paragraph("Complete stripping every 3h, intramammary antibiotic infusion + systemic NSAIDs.", table_cell_style)
        ],
        [
            Paragraph("<b>Black Quarter (BQ)</b>", table_cell_style),
            Paragraph("Crackling gas swellings over heavy muscles (thigh/shoulder), acute severe lameness, high fever.", table_cell_style),
            Paragraph("<font color='#ef4444'><b>RED</b></font>", table_cell_style),
            Paragraph("Critical emergency: High-dose Penicillin IM/IV; vaccinate remainder of herd.", table_cell_style)
        ],
        [
            Paragraph("<b>Hemorrhagic Septicemia</b>", table_cell_style),
            Paragraph("Submandibular throat swelling, snoring breathing, respiratory stertor, high fever.", table_cell_style),
            Paragraph("<font color='#ef4444'><b>RED</b></font>", table_cell_style),
            Paragraph("Urgent IV Sulphadimidine 33.3% / Oxytetracycline administration.", table_cell_style)
        ],
        [
            Paragraph("<b>PPR (Goat Plague)</b>", table_cell_style),
            Paragraph("Erosive stomatitis, foul watery diarrhea, oculonasal discharge, pneumonia in goats/sheep.", table_cell_style),
            Paragraph("<font color='#ef4444'><b>RED</b></font>", table_cell_style),
            Paragraph("Isolate affected small ruminants; fluid therapy + antibiotics for pneumonia.", table_cell_style)
        ]
    ]
    vet_table = Table(vet_rows, colWidths=[100, 160, 60, 180])
    vet_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_DARK),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(vet_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 3: OFFLINE STORAGE & SYNC ENGINE
    # =========================================================================
    story.append(Paragraph("3. Offline Storage & Synchronization Protocol", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    story.append(Paragraph("A. Native IndexedDB Data Schema", h2_style))
    story.append(Paragraph(
        "All application state resides primarily in the browser's native IndexedDB (<code>OneHealthOfflineDB</code>, version 2), ensuring full durability even across browser reloads or device restarts.",
        body_style
    ))

    db_rows = [
        [Paragraph("<b>Store Name</b>", table_header_style), Paragraph("<b>Key Path</b>", table_header_style), Paragraph("<b>Indexes</b>", table_header_style), Paragraph("<b>Purpose</b>", table_header_style)],
        [
            Paragraph("<code>cases</code>", table_cell_style),
            Paragraph("<code>id</code> (String)", table_cell_style),
            Paragraph("case_type, risk_level, village, is_synced, client_created_at", table_cell_style),
            Paragraph("Stores complete screening records, vitals, Z-scores, photo references, triage status, and doctor reviews.", table_cell_style)
        ],
        [
            Paragraph("<code>sync_queue</code>", table_cell_style),
            Paragraph("<code>queue_id</code> (Auto)", table_cell_style),
            Paragraph("status, entity_id", table_cell_style),
            Paragraph("Stores pending operations (SAVE_CASE, SAVE_REVIEW) waiting to be synced with backend.", table_cell_style)
        ],
        [
            Paragraph("<code>media_blobs</code>", table_cell_style),
            Paragraph("<code>id</code> (String)", table_cell_style),
            Paragraph("None", table_cell_style),
            Paragraph("Stores compressed JPEG base64 data URLs for skin lesions, rashes, or udder swelling.", table_cell_style)
        ],
        [
            Paragraph("<code>alerts</code>", table_cell_style),
            Paragraph("<code>id</code> (Integer)", table_cell_style),
            Paragraph("None", table_cell_style),
            Paragraph("Caches community outbreak alerts locally for offline display.", table_cell_style)
        ],
        [
            Paragraph("<code>settings</code>", table_cell_style),
            Paragraph("<code>key</code> (String)", table_cell_style),
            Paragraph("None", table_cell_style),
            Paragraph("Stores active language, device ID, reviewer profile, and last server sync timestamp.", table_cell_style)
        ]
    ]
    db_table = Table(db_rows, colWidths=[80, 80, 150, 190])
    db_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(db_table)

    story.append(Spacer(1, 10))

    story.append(Paragraph("B. Synchronization Protocol & Conflict Handling", h2_style))
    story.append(Paragraph(
        "Synchronization is bidirectional, fault-tolerant, and atomic:",
        body_style
    ))
    story.append(Paragraph("<b>1. Event-Driven Auto Sync:</b> The engine registers <code>window.addEventListener('online')</code>. When connectivity is restored, it initiates an automatic batch flush.", bullet_style))
    story.append(Paragraph("<b>2. Batch Sync Endpoint (<code>/api/sync/batch</code>):</b> Collects all pending records in a single payload. The server validates, updates existing records, registers clinical reviews, and returns newly created server cases and active outbreak alerts.", bullet_style))
    story.append(Paragraph("<b>3. Queue Clearing & State Reconciliation:</b> On HTTP 200 response, queued items are atomically removed from IndexedDB, and cases are marked with <code>is_synced: true</code>. Server-side clinical reviews and prescription updates are upserted into the local database.", bullet_style))

    story.append(Spacer(1, 10))

    # Multilingual & Voice
    story.append(Paragraph("4. Multilingual Engine & Accessibility", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))
    story.append(Paragraph(
        "To serve rural populations with varying literacy levels, ONEHEALTH AI includes built-in accessibility features:",
        body_style
    ))
    story.append(Paragraph("<b>1. Trilingual Support:</b> Full translations for <b>English</b>, <b>Marathi (मराठी)</b>, and <b>Hindi (हिंदी)</b>. Language switching is instantaneous via DOM data attributes without requiring page reload.", bullet_style))
    story.append(Paragraph("<b>2. Text-to-Speech (TTS) Narration:</b> Uses the browser Web Speech API (<code>SpeechSynthesisUtterance</code>) tuned with regional voice codes (<code>mr-IN</code>, <code>hi-IN</code>, <code>en-IN</code>) and a deliberate 0.95x cadence for clear comprehension by rural villagers.", bullet_style))
    story.append(Paragraph("<b>3. Voice Dictation (STT):</b> Leverages <code>SpeechRecognition</code> allowing ASHA workers or farmers to speak symptoms and clinical notes directly into forms.", bullet_style))
    story.append(Paragraph("<b>4. On-Device Image Compression:</b> Resizes camera photos on an HTML5 canvas to a max 1024px dimension and 75% JPEG quality (~40-80 KB), calculating an Erythema Redness Index while preventing 2G/3G sync timeouts.", bullet_style))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 4: PROJECT STRUCTURE & RUN GUIDE
    # =========================================================================
    story.append(Paragraph("5. Complete Project Directory Structure", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    struct_text = (
        "proud-turing/\n"
        "├── backend/\n"
        "│   ├── __init__.py\n"
        "│   ├── main.py               # FastAPI App entrypoint, CORS & static mounting\n"
        "│   ├── database.py           # SQLAlchemy engine (SQLite & PostgreSQL support)\n"
        "│   ├── models.py             # User, Case, ClinicalReview, OutbreakAlert models\n"
        "│   ├── schemas.py            # Pydantic v2 validation schemas & batch payloads\n"
        "│   ├── seed_data.py          # Realistic seed generator for Kopargaon cases & alerts\n"
        "│   └── routers/\n"
        "│       ├── cases.py          # Cases CRUD & filtering API\n"
        "│       ├── sync.py           # Batch sync & offline queue reconciliation endpoint\n"
        "│       ├── professionals.py  # Doctor (MBBS) & Vet (BVSc) triage queues & reviews\n"
        "│       └── analytics.py      # Community surveillance & outbreak alerts API\n"
        "├── public/                   # Progressive Web Application (PWA) Frontend\n"
        "│   ├── index.html            # Single Page Application HTML5 structure\n"
        "│   ├── manifest.json         # PWA Manifest (standalone display, theme, icons)\n"
        "│   ├── service-worker.js     # Service Worker with Cache-First app shell caching\n"
        "│   ├── css/\n"
        "│   │   └── main.css          # Mobile-first CSS design system & print styles\n"
        "│   ├── js/\n"
        "│   │   ├── db.js             # Promisified IndexedDB offline database layer\n"
        "│   │   ├── ai-engine.js      # Autonomous client-side AI triage engine\n"
        "│   │   ├── sync.js           # Network monitor & batch sync coordinator\n"
        "│   │   ├── i18n.js           # English, Marathi, Hindi translation dictionaries\n"
        "│   │   ├── voice.js          # Speech synthesis (TTS) & dictation (STT)\n"
        "│   │   ├── camera.js         # Camera capture, canvas compression & color index\n"
        "│   │   ├── analytics.js      # Epidemiological surveillance & chart visualizer\n"
        "│   │   └── app.js            # Main UI router, form handlers & review modals\n"
        "│   └── icons/                # PWA icons (icon.svg, icon-192.png, icon-512.png)\n"
        "├── tests/\n"
        "│   └── test_api.py           # Automated test suite (6 passing test suites)\n"
        "├── run.py                    # Convenient one-click server starter script\n"
        "└── README.md                 # Complete project README and usage guide"
    )
    story.append(Paragraph(struct_text.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_style))

    story.append(Spacer(1, 10))

    # Step-by-Step Run & Test Guide
    story.append(Paragraph("6. Installation, Execution & Testing Guide", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))

    story.append(Paragraph("A. Prerequisites & Dependencies", h2_style))
    story.append(Paragraph("Ensure Python 3.10+ is installed. Install required packages:", body_style))
    story.append(Paragraph("<code>pip install fastapi uvicorn sqlalchemy pydantic pillow reportlab</code>", code_style))

    story.append(Paragraph("B. Starting the Server", h2_style))
    story.append(Paragraph("Execute the server runner script:", body_style))
    story.append(Paragraph("<code>python run.py</code>", code_style))
    story.append(Paragraph("The server initializes the database, automatically seeds realistic Kopargaon demonstration cases and active outbreak alerts, and serves both the PWA and REST APIs on <b>http://localhost:8000</b>.", body_style))

    story.append(Paragraph("C. Running Automated Unit Tests", h2_style))
    story.append(Paragraph("Execute the comprehensive test suite:", body_style))
    story.append(Paragraph("<code>python -m unittest tests/test_api.py</code>", code_style))

    story.append(Paragraph("D. Step-by-Step Offline & Sync Verification", h2_style))
    story.append(Paragraph("<b>1. Open Browser:</b> Navigate to <code>http://localhost:8000</code> in Chrome/Edge.", bullet_style))
    story.append(Paragraph("<b>2. Switch to Offline Mode:</b> Press <code>F12</code> -> <i>Network tab</i> -> Select <b>'Offline'</b>.", bullet_style))
    story.append(Paragraph("<b>3. Complete a Screening:</b> Tap <i>Start Screening</i> -> Select Human, Child, or Livestock -> Submit.", bullet_style))
    story.append(Paragraph("<b>4. Verify Offline Result:</b> Observe instant AI risk calculation and recommendations. In the <i>Cases</i> tab, notice the record marked as <code>🟠 Saved Offline</code>.", bullet_style))
    story.append(Paragraph("<b>5. Switch Back to Online:</b> In DevTools, set Network to <b>'No throttling (Online)'</b>. Watch the sync badge turn green and the record status update to <code>🟢 Synced</code>.", bullet_style))
    story.append(Paragraph("<b>6. Professional Portal Sign-Off:</b> Navigate to the <i>Portal</i> tab -> Open any case -> Add clinical prescription -> Tap <i>Submit Review & Sign-Off</i> -> Print clinical referral slip.", bullet_style))

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF documentation generated successfully: {filename}")


if __name__ == "__main__":
    out_name = os.path.join(os.path.dirname(__file__), "ONEHEALTH_AI_PROJECT_DOCUMENTATION.pdf")
    build_pdf(out_name)
