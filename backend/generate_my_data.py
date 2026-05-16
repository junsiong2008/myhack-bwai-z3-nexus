"""
Generate Malaysian-flavoured companies.json, mentors.json, and matches.json.
Run: python generate_my_data.py
"""
import json, random, pickle, os
from itertools import product

rng = random.Random(2026)

# ── Load model bundle for index mappings ───────────────────────────────────────
BASE = os.path.dirname(__file__)
MOCK = os.path.join(BASE, 'mock')
with open(f'{BASE}/nexus_matching_model.pkl', 'rb') as f:
    bundle = pickle.load(f)
SECTOR_IDX = bundle['sector_idx']
STAGE_IDX  = bundle['stage_idx']
GEO_IDX    = bundle['geo_idx']

SECTORS = ["Fintech","Healthtech","Edtech","Agritech","Cleantech",
           "Logistics","E-commerce","Cybersecurity","AI/ML","IoT"]
STAGES  = ["Idea","Pre-seed","Seed","Series A","Series B"]
GEOS    = ["MY","SG","ID","TH","VN","PH"]
NEEDS   = ["Mentorship","Legal","Funding","BD","Marketing",
           "Tech Advisory","HR","Finance","Regulatory","IP"]
PIPELINE_STAGES = ["Applied","Screened","Mentor Assigned","Engaged","Graduated"]

# ── Company name pools (sector → names, then overflow with suffixes) ───────────
COMPANY_NAMES = {
    "Fintech": [
        "PayHive","RakyatPay","DuitSmart","WangKita","BayarEasy","KredKita",
        "SimpanSmart","DanaPlus","PinjamPro","CashBridge","TabungDigital",
        "FinX","ZakatPro","InsurKita","BondMY","WealthKita","NabilaPay",
        "RinggitAI","BayarKita","EwanPay","DanaKita","CashMY","LoanBridge",
        "ModalKita","InvestMY","KewanganAI","TabungPlus","TakafulTech",
        "PayBridge","WalletKita",
    ],
    "Healthtech": [
        "MedLink","SihatAI","DocKita","KlinikDigital","HealthBridge","MedEasy",
        "SihatPlus","PharmacyKita","MedMY","KesihatanAI","DokterKita",
        "TelemedMY","CareKita","NurseLink","SihatHub","KlinikPlus",
        "HealthKita","MedBridge","CareAI","WellnessKita","DiagnostixMY",
        "PillarsHealth","MedicKita","DocBridge","HealthNet",
    ],
    "Edtech": [
        "BelajarAI","TutorKita","PindarMY","IlmuKita","CerdikKita","LearnMY",
        "AkademiAI","GurukuDigital","SkillKita","EduBridge","PindarPlus",
        "IlmuHub","BelajarPro","SkillMY","TeachKita","EduKita","LearnBridge",
        "CerdikMY","GradKita","KnowledgeMY",
    ],
    "Agritech": [
        "AgriKita","PadiSmart","LadangDigital","FarmKita","TanahAI",
        "HasilBumi","AgriSense","FarmLink","KawasanSmart","TuaiPlus",
        "AgriMY","FarmBridge","LadangAI","PadiMY","TanahKita",
    ],
    "Cleantech": [
        "GreenWatt","SolarKita","HijauMY","EcoKita","SolarSmart",
        "EnergiBersih","CleanMY","EnergiKita","SolarBridge","HijauAI",
        "EcoMY","GreenKita","RenewMY","SolarPlus","CleanBridge",
    ],
    "Logistics": [
        "LogiKita","HantarMY","CargoKita","UrbanLogis","HantarCepat",
        "CargoAI","DelivKita","LogiSmart","AngkutMY","FleetKita",
        "HantarPlus","LogiBridge","CargoMY","DelivMY","AngkutAI",
    ],
    "E-commerce": [
        "ShopKita","JualMY","PasarDigital","MarketKita","JualOnline",
        "BazaarMY","PasarKita","ShopMY","MerchantKita","JualSmart",
        "PasarAI","ShopBridge","MarketMY","JualPlus","BazaarAI",
    ],
    "Cybersecurity": [
        "SecureKita","CyberMY","GuardAI","ShieldTech","SentinelMY",
        "DataGuard","CyberKita","SecureMY","GuardPlus","ShieldMY",
        "SentinelAI","LockBridge","VaultKita","ProtectMY","CipherKita",
    ],
    "AI/ML": [
        "NexusAI","DataKita","BrainMY","SmartData","AnalyticsKita",
        "CognitaMY","VisionAI","DeepKita","ModelMY","InferKita",
        "DataBridge","NeuralMY","SmartKita","AIMY","DeepBridge",
    ],
    "IoT": [
        "SensorKita","ConnectMY","SmartDevMY","IoTKita","PintuSmart",
        "LampuAI","DeviceMY","SensorPlus","ConnectKita","IoTBridge",
        "SmartMY","PintuAI","SensorAI","LinkKita","DeviceBridge",
    ],
}

def pick_company_name(sector, used):
    pool = COMPANY_NAMES[sector]
    available = [n for n in pool if n not in used]
    if available:
        return rng.choice(available)
    # overflow: add numeric suffix
    base = rng.choice(pool)
    return f"{base}{rng.randint(2,9)}"

# ── Generate 300 companies ─────────────────────────────────────────────────────
companies = []
used_names = set()

# Stage/geo distribution weights
stage_weights = [0.12, 0.22, 0.38, 0.20, 0.08]   # Idea,Pre-seed,Seed,SerA,SerB
geo_weights   = [0.68, 0.12, 0.08, 0.05, 0.04, 0.03]  # MY,SG,ID,TH,VN,PH

sector_cycle = SECTORS * 30   # 30 companies per sector = 300

for i, sector in enumerate(sector_cycle, start=1):
    stage    = rng.choices(STAGES, weights=stage_weights)[0]
    geo      = rng.choices(GEOS,   weights=geo_weights)[0]
    name     = pick_company_name(sector, used_names)
    used_names.add(name)

    n_needs  = rng.randint(1, 3)
    needs    = rng.sample(NEEDS, n_needs)

    prog_year = rng.choice([2022, 2023, 2024, 2025])
    team_size = rng.randint(2, 40)
    founding  = rng.randint(2018, 2025)
    pip_stage = rng.choices(PIPELINE_STAGES, weights=[0.15,0.20,0.30,0.20,0.15])[0]

    companies.append({
        "id":             f"C{i:04d}",
        "name":           name,
        "sector":         sector,
        "stage":          stage,
        "geography":      geo,
        "team_size":      team_size,
        "founding_year":  founding,
        "needs":          needs,
        "programme_year": prog_year,
        "pipeline_stage": pip_stage,
    })

# ── Mentor data ────────────────────────────────────────────────────────────────
MENTOR_PROFILES = [
    # (name, primary, secondary, geo, yrs_exp, bio_snippet)
    ("Ahmad Razif Ismail",   "Fintech",        "AI/ML",       "MY", 18,
     "Former VP Digital Banking at Maybank; led the launch of Maybank2u mobile 2.0 serving 10M users. Advisor to BigPay and iPay88 on regulatory compliance."),
    ("Tan Kok Wei",          "AI/ML",          "Fintech",      "MY", 15,
     "Ex-Head of Data Science at Grab Malaysia; built the GrabPay fraud detection ML pipeline. Co-founder of two AI/ML startups acquired by Axiata Digital."),
    ("Nurul Izzah Rahmat",   "Healthtech",     "Edtech",       "MY", 12,
     "Led digital health transformation at KPJ Healthcare; piloted tele-health across 28 hospitals. Advisor to Klinik Digital and MedEasy on BNM and MOH compliance."),
    ("Priya Krishnan",       "Edtech",         "AI/ML",        "MY", 14,
     "Built the e-learning platform at TM ONE reaching 500k learners; advised MOE on national coding curriculum. Mentor at MDEC's Malaysia Tech Entrepreneur Programme."),
    ("Mohd Faizal Yusuf",    "Logistics",      "E-commerce",   "MY", 20,
     "20 years in logistics; previously COO at Pos Malaysia and country lead for Ninja Van Malaysia. Scaled last-mile delivery to 100k parcels/day."),
    ("Lim Swee Goh",         "Fintech",        "Legal",        "SG", 22,
     "Former Chief Compliance Officer at CIMB Group; expert in MAS and BNM fintech licensing. Advisory board member of PolicyStreet and MoneyMatch."),
    ("Vijay Narayanan",      "Cybersecurity",  "AI/ML",        "MY", 17,
     "Built the SOC team at Axiata Group protecting 300M subscribers. Led cybersecurity framework adoption at CelcomDigi post-merger. CISA and CISSP certified."),
    ("Siti Hajar Mohd Nor",  "Agritech",       "IoT",          "MY", 11,
     "Pioneered precision farming IoT deployments with FELDA and MARDI across 50k hectares. Expert in agri-data analytics and MITI's agritech grant ecosystem."),
    ("Chong Wei Hong",       "E-commerce",     "Logistics",    "MY", 16,
     "Ex-MD at Lazada Malaysia; grew GMV from RM50M to RM1.2B in 4 years. Advisor to ShopKita and PasarDigital on marketplace scaling and seller acquisition."),
    ("Suresh Kumar Pillai",  "Healthtech",     "AI/ML",        "MY", 13,
     "Former Chief Digital Officer at IHH Healthcare Malaysia. Led AI diagnostics rollout at Pantai Hospitals. Advisor to MOH's National Health Data Centre."),
    ("Rozana Yusoff",        "Cleantech",      "IoT",          "MY", 14,
     "Spent 10 years at Tenaga Nasional Berhad (TNB) rolling out smart grid and solar net metering. Expert in SEDA Malaysia's FiT incentive framework."),
    ("Wong Kok Seng",        "AI/ML",          "Cybersecurity","SG", 19,
     "Principal Data Scientist at Grab Financial Group; built credit-scoring models for the unbanked across ASEAN. Advisor to GHL on ML-powered payment risk."),
    ("Hairul Azam Zakaria",  "Fintech",        "Regulatory",   "MY", 16,
     "Ex-BNM officer; instrumental in drafting the e-KYC framework and digital bank licensing guidelines. Advisor to BigPay, Boost, and three Cradle Fund fintech cohorts."),
    ("Nanthini Maniam",      "Edtech",         "HR",           "MY", 10,
     "Head of L&D at Telekom Malaysia (TM); deployed digital upskilling to 30k employees. Expert in HRDF-claimable programmes and MyFutureJobs platform integration."),
    ("Lee Boon Huat",        "Logistics",      "IoT",          "MY", 21,
     "Group VP Operations at MISC Berhad; expert in maritime IoT and supply chain digitalisation. Advisor on Industry 4.0 grant applications under MITI."),
    ("Rafidah Hassan",       "Fintech",        "Agritech",     "MY", 15,
     "Led Islamic fintech product development at RHB Islamic Bank. Expert in takaful tech, agri-financing, and Agrobank digital lending programmes."),
    ("Ng Chin Aik",          "Cybersecurity",  "Fintech",      "MY", 18,
     "Former CISO at Public Bank Berhad; designed PCI-DSS and ISO 27001 frameworks used by 12M customers. Advisor to CyberSecurity Malaysia on SME threat-intel sharing."),
    ("Ganesh Raman",         "AI/ML",          "Logistics",    "MY", 12,
     "Built demand-forecasting and route-optimisation AI at Ninja Van Malaysia serving 15M parcels/month. Expertise in MLOps and AWS SageMaker deployments."),
    ("Shahril Mokhtar",      "E-commerce",     "Marketing",    "MY", 14,
     "CMO at Carsome Malaysia; grew organic acquisition 10x via data-driven performance marketing. Advisor on marketplace SEO, seller tools, and app-growth funnels."),
    ("Kavitha Sundaram",     "Healthtech",     "Regulatory",   "MY", 16,
     "Registered pharmacist; former Head of Digital Health at Pharmaniaga Berhad. Expert in BNM medical financing, MOH Digital Health Blueprint, and PDPA compliance."),
    ("Mohd Nizam Jaafar",    "IoT",            "Cleantech",    "MY", 13,
     "IoT architect at Maxis Business; deployed smart-building solutions for Sime Darby and YTL. Expert in LoRaWAN, NB-IoT, and Malaysia's Industry4WRD roadmap."),
    ("Chan Kok Leong",       "Fintech",        "E-commerce",   "MY", 17,
     "Co-founded Revenue Monster; scaled QR-pay acceptance to 500k merchants across Malaysia. Advisor on payment gateway licensing and Visa/Mastercard certification."),
    ("Anitha Ramu",          "Edtech",         "Marketing",    "MY", 11,
     "Head of Growth at Fave Malaysia; led student and tutor acquisition campaigns reaching 2M users. Expert in micro-influencer campaigns and Malaysian Gen-Z media mix."),
    ("Azman Ibrahim",        "Cleantech",      "Fintech",      "MY", 20,
     "20-year career at Petronas; led the Digital Energy and Carbon Accounting programme. Advisor to GreenWatt and SEDA Malaysia on carbon credit tokenisation."),
    ("Yong Chun Ming",       "AI/ML",          "Healthtech",   "SG", 14,
     "Data science lead at Great Eastern Life Malaysia; built ML claims-fraud models saving RM80M/year. Expert in health AI regulation under BNM and MoH dual oversight."),
    ("Norhayati Abdullah",   "Agritech",       "Finance",      "MY", 12,
     "Programme manager at Agrobank; managed RM500M in agri-SME financing. Expert in Skim Pembiayaan Ladang and FAMA digital marketplace integrations."),
    ("Lau Kim Hin",          "Logistics",      "AI/ML",        "MY", 15,
     "VP Engineering at GDex; built real-time fleet-tracking and parcel-sorting AI. Scaled engineering team from 5 to 60 during Malaysia e-commerce boom."),
    ("Wan Fadzilah",         "Cybersecurity",  "E-commerce",   "MY", 13,
     "Incident response lead at CelcomDigi; handled three major breaches affecting 5M subscribers. Advisor on PDPA compliance, bug-bounty programmes, and NACSA frameworks."),
    ("Deepa Rajasekaran",    "Fintech",        "HR",           "MY", 10,
     "Head of People at Boost (Axiata Digital); scaled fintech talent from 50 to 400. Expert in tech talent acquisition in Malaysia's competitive fintech landscape."),
    ("Goh Seng Huat",        "IoT",            "AI/ML",        "SG", 16,
     "Principal Engineer at ST Engineering; led IoT sensor fusion for Changi Airport and Malaysian Expressways. Expert in edge AI and MCMC-compliant spectrum usage."),
    ("Siva Murugan",         "Healthtech",     "IoT",          "MY", 14,
     "CTO at Thomson Medical Malaysia; deployed IoT patient-monitoring saving 30% nursing hours. Advisor to MedLink and SihatAI on HL7-FHIR and MOH data standards."),
    ("Faridah Mansor",       "Edtech",         "Agritech",     "MY", 11,
     "Curriculum director at Open University Malaysia (OUM); led online vocational training for B40 via HRDF and JTM. Expert in Micro-Credential Framework Malaysia."),
    ("Nathan Pillai",        "Fintech",        "Cybersecurity","MY", 17,
     "Ex-Group CIO at AMMB Holdings (AmBank); led core-banking modernisation and Open API rollout. Advisor on BNM's Open Finance framework and API monetisation."),
    ("Mazlan Aziz",          "AI/ML",          "E-commerce",   "MY", 13,
     "Head of Data Platform at Shopee Malaysia; built real-time personalisation engine for 20M MAU. Expert in Spark, Kafka, and Malaysia-specific consumer behaviour data."),
    ("Ong Beng Huat",        "Cleantech",      "Agritech",     "MY", 18,
     "Spent 15 years at Sime Darby Plantation; led precision-agriculture and sustainability reporting using GIS and IoT. Expert in RSPO, MSPO, and ESG grant access."),
    ("Rashdan Yusof",        "Logistics",      "Fintech",      "MY", 16,
     "Ex-CEO of Pos Laju; transformed last-mile infrastructure and launched PosDelivery same-day service. Advisor on last-mile economics and franchise logistics models."),
    ("Malini Gopal",         "E-commerce",     "Marketing",    "MY", 12,
     "Regional brand lead at AirAsia X (MOVE); led cross-border loyalty programme reaching 8M members. Expert in loyalty mechanics, travel e-commerce, and CRM automation."),
    ("Khairul Anuar",        "Cybersecurity",  "AI/ML",        "MY", 15,
     "Red-team lead at Axiata's Group CISO office; conducted penetration testing across 10 OpCos. Certified OSCP and OSCE; advisor to CyberSecurity Malaysia on APT simulation."),
    ("Michelle Lim",         "Fintech",        "E-commerce",   "SG", 13,
     "Head of Regional Partnerships at GrabPay; structured merchant-acquisition deals across MY, SG, and ID reaching 300k merchants. Expert in QR interoperability and DuitNow integration."),
    ("Bala Subramaniam",     "Agritech",       "IoT",          "MY", 20,
     "20 years at MARDI and Universiti Putra Malaysia (UPM); led smart greenhouse and aquaculture IoT programmes. Expert in MOA grants, GI certification, and halal agritech."),
    ("Dzuleira Abu Bakar",   "AI/ML",          "Fintech",      "MY", 14,
     "Former CEO of Cradle Fund; championed RM800M in startup investments. Deep network in Khazanah, PNB, and MAVCAP deal structuring. Expert in IP commercialisation."),
    ("Jason Tan",            "E-commerce",     "Logistics",    "MY", 11,
     "Co-founder of ShopBack Malaysia; built cashback ecosystem to 1M users and 2,000 merchant partners. Advisor on affiliate marketing, fintech checkout, and BNPL integration."),
    ("Norzilah Mohd",        "Healthtech",     "Finance",      "MY", 13,
     "CFO at Columbia Asia Hospitals Malaysia; structured RM300M sukuk financing for hospital expansion. Expert in MOH hospital licensing, insurance panel onboarding, and medical billing."),
    ("Ravinesh Raju",        "IoT",            "Logistics",    "MY", 12,
     "IoT Solutions Architect at TM ONE; deployed connected-factory solutions at Proton and Top Glove. Expert in Industri4WRD readiness assessment and SME digitalisation grants."),
    ("Zulkifli Hassan",      "Cleantech",      "Regulatory",   "MY", 19,
     "Ex-Director at Energy Commission Malaysia (ST); authored the Net Energy Metering 3.0 policy. Advisor to GreenWatt, SolarKita, and EcoKita on RE licensing and grid connection."),
    ("Sim Bak Tong",         "AI/ML",          "Cybersecurity","MY", 16,
     "VP of AI/Security at CTOS Data Systems; built credit-bureau ML and fraud-graph models for 2M SMEs. Expert in credit analytics, PDPA data-sharing agreements, and alternative credit."),
    ("Sharmila Devi",        "Edtech",         "HR",           "MY", 10,
     "Head of Talent at MDEC; led the MYDigital scholarship and developer upskilling programme training 50k workers. Expert in industry–academia linkage and TVET digitalisation."),
    ("Koh Wei Ming",         "Fintech",        "AI/ML",        "MY", 15,
     "CTO at MoneyMatch (now FX-tech subsidiary of RHB); built licensed FX remittance core handling RM1B/year. Expert in BNM e-Money licensing and ISO 20022 payment standards."),
    ("Suraya Othman",        "Agritech",       "Marketing",    "MY", 11,
     "Brand and trade director at Felda Global Ventures; managed RM2B in commodity exports. Expert in halal certification, MATRADE export facilitation, and B2B agri-marketplace."),
    ("Rajesh Gopal",         "Cybersecurity",  "Fintech",      "MY", 14,
     "Group Head of InfoSec at Maybank; led digital-bank security architecture for MAE and Maybank2u. Certified CISM; advisor on BNM RMiT (Risk Management in Technology) compliance."),
    ("Alice Chew",           "E-commerce",     "AI/ML",        "MY", 12,
     "Head of Data at 99 Group (99.co / iProperty); built property-recommendation AI for 5M monthly visitors. Expert in PropTech product analytics and Malaysia's HOC incentive landscape."),
    ("Mohan Pillai",         "Logistics",      "Cleantech",    "MY", 17,
     "COO at DHL Express Malaysia; led green logistics initiative reducing carbon per shipment by 25%. Expert in GSCOP certification, EV fleet transition, and Customs Digital Gateway integration."),
    ("Kenneth Goh",          "Fintech",        "Agritech",     "MY", 13,
     "Investment director at Agro Bank Ventures; managed RM200M agri-fintech portfolio. Expert in Skim Pembiayaan Mikro Agro, impact measurement, and ESG-linked financing structures."),
    ("Hasnah Salleh",        "Healthtech",     "Edtech",       "MY", 12,
     "Digital health lead at PETRONAS Medical & Health; implemented occupational health AI for 50k employees. Advisor on MOH digital health licensing and employer-health platform design."),
    ("Brian Ong",            "IoT",            "E-commerce",   "MY", 14,
     "Head of Smart Retail at Maxis; deployed IoT inventory-management systems across 500 7-Eleven and myNEWS stores. Expert in RFID, computer vision, and Malaysia's retail IoT grants."),
    ("Arvin Kumar",          "AI/ML",          "Edtech",       "MY", 10,
     "Data lead at AirAsia Academy; built personalised learning path AI for pilot and cabin crew training. Expert in xAPI, LRS systems, and regulatory training compliance in aviation."),
    ("Tengku Zafrul Aziz",   "Fintech",        "Regulatory",   "MY", 25,
     "Former Minister of Finance Malaysia and CEO of CIMB Group. Deep expertise in government-linked investment, capital markets, and the Bursa Malaysia listing process."),
    ("Cindy Lim",            "E-commerce",     "Fintech",      "SG", 11,
     "Head of Merchant Acquisition at Shopee Pay MY/SG; onboarded 150k SME merchants to e-wallet. Expert in BNPL, micro-merchant credit, and Shopee Paylater regulatory compliance."),
    ("Geeta Balakrishnan",   "Healthtech",     "AI/ML",        "MY", 13,
     "ML engineer lead at Naluri (digital therapeutics); built mental health AI serving corporate clients including Maybank and PETRONAS. Expert in ACT-based health coaching automation."),
    ("Zainal Abidin",        "Logistics",      "IoT",          "MY", 22,
     "Ex-VP at Kontena Nasional Berhad; managed 15k container fleet with IoT telemetry. Advisor to LogiKita and HantarMY on freight digitalisation and Customs Digital Integration."),
    ("Sarah Ng",             "Cybersecurity",  "E-commerce",   "MY", 11,
     "Cyber threat analyst at Celcom Digi; led SOAR implementation reducing incident-response time by 60%. Advisor on PDPA impact assessments and red-team readiness for e-commerce platforms."),
    ("Hafizuddin Aziz",      "Cleantech",      "Finance",      "MY", 16,
     "Structured green sukuk at CIMB Islamic totalling RM3B for solar and EV charging projects. Expert in Bursa Malaysia ESG reporting, SC sustainable finance taxonomy, and blended finance."),
    ("Emily Chin",           "AI/ML",          "HR",           "MY", 10,
     "Head of People Analytics at Grab Malaysia; built attrition-prediction and performance-calibration ML tools for 8k employees. Expert in HRIS integration and WorkDay data pipelines."),
    ("Saravanan Murugan",    "Agritech",       "Cleantech",    "MY", 15,
     "Scientist at Malaysian Palm Oil Board (MPOB); developed methane-capture technology deployed on 40 estates. Expert in MPOB licensing, biogas grants, and RSPO audit preparation."),
    ("Daniel Khor",          "Fintech",        "Logistics",    "MY", 14,
     "Head of Merchant Solutions at PayEx (now SoftSpace); integrated payment terminals across 20k POS locations in Malaysia. Expert in merchant acquiring, EMVCo standards, and BNM e-Money Tier 2."),
    ("Asha Nair",            "Edtech",         "Fintech",      "MY", 11,
     "Product lead at StudyPal (Axiata Digital Advertising subsidiary); grew MOOC user base to 800k. Expert in freemium-to-paid conversion, scholarship monetisation, and HRDF-subsidy positioning."),
    ("Mohd Ridhwan Harun",   "IoT",            "AI/ML",        "MY", 13,
     "Solutions architect at Huawei Malaysia; led smart-city IoT deployments in Putrajaya and Iskandar Malaysia. Expert in MCMC Type Approval, 5G private network licensing, and Smart City Malaysia Blueprint."),
    ("Dinesh Raj",           "Cybersecurity",  "Logistics",    "MY", 16,
     "CISO at Pos Malaysia Berhad; secured digital logistics infrastructure handling 400k parcels/day. Expert in zero-trust architecture, ISO 28000 supply-chain security, and government procurement standards."),
    ("Jasmin Hamdan",        "Healthtech",     "Marketing",    "MY", 10,
     "Growth director at BookDoc (Sunway Health digital arm); scaled patient-booking to 1M app downloads. Expert in Google Health integrations, patient-acquisition funnels, and MOH app listings."),
    ("Kumar Krishnamurthy",  "AI/ML",          "Agritech",     "MY", 17,
     "Chief Scientist at Sime Darby Plantation Digital; built yield-prediction models across 600k hectares. Expert in satellite imagery analysis, weather ML, and MSPO sustainability data."),
    ("Normah Mohd Yusof",    "Fintech",        "Edtech",       "MY", 14,
     "Head of Financial Education at Bank Negara Malaysia (BNM); led POWER! financial literacy programme reaching 500k youth. Expert in ASNB, EPF digital, and youth savings product design."),
    ("David Wong",           "E-commerce",     "AI/ML",        "MY", 16,
     "CTO at iProperty.com.my; built ML-powered property valuation and mortgage-matching for 3M monthly users. Advisor on PropTech product strategy and NAPIC data API integration."),
    ("Rita Krishnan",        "Cleantech",      "AI/ML",        "MY", 12,
     "Climate data scientist at WWF Malaysia; built deforestation-detection AI using Sentinel-2 imagery. Expert in carbon accounting methodologies, Verra VCS standards, and green grant applications."),
    ("Chin Wai Kit",         "Logistics",      "Fintech",      "MY", 15,
     "Head of Fleet Finance at Grab Transport Malaysia; structured RM150M EV-driver financing scheme. Expert in usage-based insurance, fleet telematics, and Grab Driver Partner economics."),
    ("Rina Sulaiman",        "Fintech",        "Healthtech",   "MY", 11,
     "Product manager at Great Eastern Takaful; launched digital Takaful micro-coverage for gig workers with Grab and foodpanda integration. Expert in BNM takaful licensing and embedded insurance APIs."),
]

# ── Generate 80 mentors ────────────────────────────────────────────────────────
mentors = []
for i, (name, primary, secondary, geo, yrs, bio) in enumerate(MENTOR_PROFILES[:80], start=1):
    capacity  = rng.randint(10, 25)
    used      = rng.randint(3, capacity - 1)
    nps       = round(rng.uniform(3.6, 5.0), 2)
    mentees   = rng.randint(5, 45)
    reuse     = (nps >= 4.0) and (mentees >= 8)
    mentors.append({
        "id":               f"M{i:03d}",
        "name":             name,
        "primary_domain":   primary,
        "secondary_domain": secondary,
        "geography":        geo,
        "years_experience": yrs,
        "past_nps":         nps,
        "total_mentees":    mentees,
        "session_capacity": capacity,
        "sessions_used":    used,
        "reuse_eligible":   reuse,
        "bio":              bio,
    })

# ── Generate matches (company-mentor pairs with computed features) ─────────────
def domain_score(sector, primary, secondary):
    if primary == sector:   return 1.0
    if secondary == sector: return 0.6
    if primary == "General": return 0.35
    return 0.2

def geo_score(cg, mg):
    asean = {"MY","SG","ID","TH","PH","VN"}
    if cg == mg: return 1.0
    if cg in asean and mg in asean: return 0.65
    return 0.3

matches = []
mentor_map = {m['id']: m for m in mentors}
company_map = {c['id']: c for c in companies}

# Sample ~270 historical pairs (not all combinations)
company_sample = rng.sample(companies, min(270, len(companies)))
for idx, company in enumerate(company_sample):
    mentor = rng.choice(mentors)
    c, m = company, mentor

    cs  = SECTOR_IDX.get(c['sector'], 0)
    mpd = SECTOR_IDX.get(m['primary_domain'], 0)
    msd = SECTOR_IDX.get(m['secondary_domain'], 0)
    cg  = GEO_IDX.get(c['geography'], 0)
    mg  = GEO_IDX.get(m['geography'], 0)
    cst = STAGE_IDX.get(c['stage'], 0)
    dm  = domain_score(c['sector'], m['primary_domain'], m['secondary_domain'])
    gm  = geo_score(c['geography'], m['geography'])
    nps = m['past_nps']
    yexp= m['years_experience']

    # Outcome: higher probability when domain/geo match well and mentor NPS high
    outcome_prob = dm * 0.45 + gm * 0.25 + (nps / 5.0) * 0.20 + rng.random() * 0.10
    outcome = 1 if outcome_prob > 0.55 else 0

    matches.append({
        "company_id":             c['id'],
        "mentor_id":              m['id'],
        "programme_year":         c['programme_year'],
        "domain_match_score":     round(dm, 3),
        "geo_match_score":        round(gm, 3),
        "exact_domain_match":     int(cs == mpd),
        "secondary_domain_match": int(cs == msd),
        "same_geography":         int(cg == mg),
        "mentor_past_nps":        nps,
        "mentor_years_exp":       yexp,
        "mentor_total_mentees":   m['total_mentees'],
        "mentor_capacity_ratio":  round(m['session_capacity'] / max(m['session_capacity'], 1), 3),
        "company_stage_idx":      cst,
        "is_seed_or_above":       int(cst >= 2),
        "company_sector_idx":     cs,
        "mentor_primary_idx":     mpd,
        "company_geo_idx":        cg,
        "mentor_geo_idx":         mg,
        "nps_x_domain":           round(nps * dm, 3),
        "exp_x_domain":           round(yexp * dm, 3),
        "outcome":                outcome,
        "mentor_past_engagements": m['total_mentees'],
    })

# ── Write files ────────────────────────────────────────────────────────────────
with open(f'{MOCK}/companies.json', 'w') as f:
    json.dump(companies, f, indent=2)
print(f"OK companies.json -- {len(companies)} companies")

with open(f'{MOCK}/mentors.json', 'w') as f:
    json.dump(mentors, f, indent=2)
print(f"OK mentors.json   -- {len(mentors)} mentors")

with open(f'{MOCK}/matches.json', 'w') as f:
    json.dump(matches, f, indent=2)
print(f"OK matches.json   -- {len(matches)} historical matches")

# ── Quick sanity check ─────────────────────────────────────────────────────────
print("\nSample companies:")
for c in companies[:5]:
    print(f"  {c['id']} | {c['name']:20s} | {c['sector']:14s} | {c['stage']:10s} | {c['geography']}")
print("\nSample mentors:")
for m in mentors[:5]:
    print(f"  {m['id']} | {m['name']:25s} | {m['primary_domain']:14s} | NPS {m['past_nps']}")
