import requests
import re
import urllib
import datetime
from bs4 import BeautifulSoup
from .utils import DIAS
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor, as_completed

def _parse_siga_table(rows, has_type):
    """Convierte filas de tabla SIGA en estructura DNF (Lista de listas)."""
    dnf_list = []
    current_group = []
    
    for r in rows:
        cols = r.find_all("td")
        vals = [" ".join(c.stripped_strings).strip() for c in cols]
        
        if not vals or len(vals) < 2: continue
        
        op = vals[0]
        sigla_ref = vals[1]
        
        entry = {"sigla": sigla_ref}
        if has_type and len(vals) >= 4:
            entry["tipo"] = vals[3] # PRE o CO

        if 'ó' in op:
            if current_group: dnf_list.append(current_group)
            current_group = [entry]
        else:
            current_group.append(entry)
    
    if current_group:
        dnf_list.append(current_group)
    return dnf_list

@lru_cache(maxsize=None)
def _fetch_requisitos_asignatura(cookies, plan, cod_asign):
    """
    Descarga y parsea los requisitos de una asignatura específica.
    Retorna tupla: (requisitos, equivalencias)
    """
    params = f"plan={plan}&cod_asign={cod_asign}"
    soup_req = _get_soup(f"https://siga.usm.cl/pag/sistinsc/insc_plan_requisito.jsp?{params}", cookies)

    req_dnf = []
    eq_norm_dnf = []
    eq_libre_list = []

    headers_list = soup_req.find_all("td", class_="Encabezado03")
    processed_tables = set()

    for h in headers_list:
        tr_header = h.parent
        table_container = tr_header.parent
        if table_container in processed_tables: continue
        processed_tables.add(table_container)

        header_texts = [" ".join(td.stripped_strings).strip() for td in tr_header.find_all("td")]
        
        is_req_table = "Tipo" in header_texts and "Operación" in header_texts
        is_eqn_table = "Operación" in header_texts and "Asignatura" in header_texts and "Tipo" not in header_texts
        is_eql_table = "Sigla" in header_texts and "Asignatura" in header_texts and "Operación" not in header_texts

        tr_data = tr_header.find_next_sibling("tr")
        if not tr_data: continue
        td_data = tr_data.find("td", class_="Celda02")
        if not td_data: continue
        table_data = td_data.find("table")
        if not table_data: continue
        
        rows_data = table_data.find_all("tr")

        if is_req_table:
            req_dnf = _parse_siga_table(rows_data, has_type=True)
        elif is_eqn_table:
            eq_norm_dnf = _parse_siga_table(rows_data, has_type=False)
        elif is_eql_table:
            for r in rows_data:
                cols = r.find_all("td")
                vals = [" ".join(c.stripped_strings).strip() for c in cols]
                if not vals: continue
                
                txt_row = " ".join(vals).lower()
                if "equivalente a" in txt_row or "cualquier asignatura" in txt_row:
                    eq_libre_list.append("CUALQUIERA")
                elif len(vals) >= 1:
                    eq_libre_list.append(vals[0])

    requisitos = req_dnf
    equivalencias = eq_norm_dnf
    for s in eq_libre_list:
        equivalencias.append([{"sigla": s}])
    return requisitos, equivalencias

def _get_soup(url, cookies):
    resp = requests.get(url, headers={"Cookie": cookies})
    return BeautifulSoup(resp.text, "html.parser")

def get_sedes_and_jornadas(cookies):
    html = _get_soup("https://siga.usm.cl/pag/sistinsc/insc_plan_frame1.jsp", cookies)
    if html.find(attrs={"href": "CerrarJsp.jsp"}):
        return {"sedes": {}, "jornadas": {}}

    return {
        "sedes": {opt["value"]: " ".join(opt.stripped_strings).strip() 
                  for opt in html.find(attrs={"name": "sede"}).find_all("option") if opt["value"] != "-1"},
        "jornadas": {opt["value"]: " ".join(opt.stripped_strings).strip() 
                     for opt in html.find(attrs={"name": "jornada"}).find_all("option") if opt["value"] != "-1"},
    }

def get_carreras(cookies, sede, jornada):
    url = f"https://siga.usm.cl/pag/sistinsc/insc_plan_frame2.jsp?sede={sede}&jornada={jornada}"
    html = _get_soup(url, cookies)
    return {opt["value"]: " ".join(opt.stripped_strings).strip() 
            for opt in html.find_all("option") if opt["value"] != "-1"}

def get_mencion_especializacion(cookies, carrera, sede, jornada):
    url = f"https://siga.usm.cl/pag/sistinsc/insc_plan_frame3.jsp?carrera={carrera}&sede={sede}&jornada={jornada}"
    html = _get_soup(url, cookies)
    return {opt["value"]: " ".join(opt.stripped_strings).strip() 
            for opt in html.find_all("option") if opt["value"] != "-1"}

def get_planes_carrera(cookies, mencion, sede, carrera):
    url = f"https://siga.usm.cl/pag/sistinsc/insc_plan_frame4.jsp?mencion={mencion}&sede={sede}&carrera={carrera}"
    try:
        html = _get_soup(url, cookies)
        return {opt["value"]: " ".join(opt.stripped_strings).strip() 
                for opt in html.find_all("option") if opt["value"] != "-1"}
    except:
        return {}

def get_info_carrera(cookies, plan, sede, carrera, mencion):
    url = f"https://siga.usm.cl/pag/sistinsc/insc_plan_frame5.jsp?plan={plan}&sede={sede}&carrera={carrera}&mencion={mencion}"
    html = _get_soup(url, cookies)
    return {inp["name"]: inp["value"].strip() or "1" for inp in html.find_all("input")}

def get_malla_carrera(cookies, sede, carrera, mencion, plan, duracion, creditos, memo_ramos=None):
    """Obtiene la malla curricular de un plan en SIGA."""
    params = f"sede={sede}&carrera={carrera}&mencion={mencion}&plan={plan}&duracion={duracion}&creditos={creditos}"
    url_list = f"https://siga.usm.cl/pag/sistinsc/listados/insc_ListPlanAsignatura.jsp?{params}"
    url_frame = f"https://siga.usm.cl/pag/sistinsc/insc_plan_frame6.jsp?{params}"
    
    if memo_ramos is None:
        memo_ramos = {}

    with ThreadPoolExecutor(max_workers=20) as executor:
        future_html = executor.submit(_get_soup, url_list, cookies)
        future_frame = executor.submit(_get_soup, url_frame, cookies)

        html = future_html.result()
        html_all = future_frame.result()

        tablas = html.find_all("table")[2::2]
        semestre = []
        
        tasks_requirements = []
        ramos_pending_map = {}

        for i, tabla_semestre in enumerate(tablas):
            ramos_semestre = {}
            
            for row in tabla_semestre.find_all("tr")[2:]:
                td = row.find_all("td")
                if len(td) != 11: continue
                
                [sigla, asig, lic, ht, hp, hl, ha, sct, depto, _, __] = [" ".join(d.stripped_strings).strip() for d in td]

                if sigla in memo_ramos:
                    ramos_semestre[sigla] = memo_ramos[sigla]
                    continue

                ramo_data = {
                    "nombre": asig.upper(),
                    "requisito_licenciatura": bool(lic),
                    "horas": {"teoricas": int(ht or 0), "practicas": int(hp or 0), "laboratorios": int(hl or 0), "ayudantias": int(ha or 0)},
                    "creditos": int(sct or 0),
                    "departamento": depto,
                    "requisitos": [],
                    "equivalencias": [],
                }

                ramos_semestre[sigla] = ramo_data
                memo_ramos[sigla] = ramo_data
                
                input_tag = html_all.find('td', string=sigla)
                if input_tag:
                    cod_asign = input_tag.find_next_sibling("input", attrs={"name": "cod_asign"})['value']
                    tasks_requirements.append((i, sigla, cod_asign))
                    ramos_pending_map[(i, sigla)] = ramo_data
            
            semestre.append(ramos_semestre)

        if tasks_requirements:
            future_to_ramo = {
                executor.submit(_fetch_requisitos_asignatura, cookies, plan, cod_asign): (sem_idx, sigla)
                for (sem_idx, sigla, cod_asign) in tasks_requirements
            }

            for future in as_completed(future_to_ramo):
                sem_idx, sigla = future_to_ramo[future]
                try:
                    reqs, eqs = future.result()
                    target_ramo = ramos_pending_map[(sem_idx, sigla)]
                    target_ramo["requisitos"] = reqs
                    target_ramo["equivalencias"] = eqs
                except Exception:
                    pass

    return semestre

def get_programacion_asignaturas(cookies, sede, jornada, nombre_sede, nombre_jornada):
    today = datetime.date.today()
    año, semestre = today.year, max(round(today.month / 6), 1)
    semestre += 2
    if semestre > 3: semestre -= 3; año += 1

    periodos = []
    rgx_sigla = re.compile(r'^[A-Z]{3}\d{3}', re.IGNORECASE)
    
    for _ in range(3):
        url = f"https://siga.usm.cl/pag/sistinsc/listados/insc_ListProgTodasAsign.jsp?sede={sede}&jornada={jornada}&ano={año}&semestre={semestre}&car=0&orden=2"
        html = _get_soup(url, cookies)
        data_periodo = []
        
        for table in html.find_all("table"):
            rows = table.findChildren("tr", recursive=False)
            if not rows: continue

            for row in rows[1:]:
                cells = row.findChildren("td", recursive=False)
                
                try:
                    if len(cells) != 7:
                        if cells and rgx_sigla.match(" ".join(cells[0].stripped_strings)):
                            raise ValueError(f"Fila corrupta: Se esperaban 7 columnas, encontradas {len(cells)}.")
                        continue
                    
                    for br in cells[4].find_all("br"): br.replace_with("###")
                    
                    raw = [re.sub(" +", " ", " ".join(c.stripped_strings).strip().replace("\n", "")) for c in cells[:6]]
                    sigla, nombre, depto, paralelo, profesor, cupo = raw
                    
                    if sigla.endswith("-") or not re.match(r"^[A-Z]{1,4}\d{1,5}(?:[A-Z]|[-_][A-Z0-9]+)?$", sigla): continue

                    lista_profes = [p.strip() for p in profesor.split("###") if p.strip()]
                    cupo_int = int(cupo)

                    r = {
                        "sigla": sigla.upper(), "nombre": nombre.upper(), "departamento": depto.upper(),
                        "paralelo": paralelo, "profesor": lista_profes, "cupo": cupo_int, "horario": []
                    }

                    horario = []
                    t_horario = cells[6].find("table", recursive=False)
                    if t_horario:
                        for rh in t_horario.findChildren("tr", recursive=False)[1:]:
                            ch = rh.findChildren("td", recursive=False)
                            if len(ch) != 7: continue
                            
                            dia, bloque_raw, _, tipo, sala_raw, campus, prof = ["\n".join(c.findAll(string=True)).strip() for c in ch]
                            
                            partes_bloque = bloque_raw.split("\n")
                            if len(partes_bloque) == 2:
                                start, end = map(int, partes_bloque)
                            elif len(partes_bloque) == 1 and partes_bloque[0]:
                                start = end = int(partes_bloque[0])
                            else:
                                raise ValueError(f"Formato bloque inválido: '{bloque_raw}'")

                            sala_limpia = sala_raw.split("\n")[0].strip()
                            sala_limpia = re.sub(r'^(?:sala|lab(?:oratorio|\.)?|taller)\s*[:.]?\s*', '', sala_limpia, flags=re.IGNORECASE)
                            if not sala_limpia: sala_limpia = "POR DEFINIR"

                            for b in range(start, end + 1):
                                horario.append({
                                    "dia": DIAS.get(dia, 0), "bloque": b, "tipo": tipo, 
                                    "sala": sala_limpia, "campus": campus, "profesor": prof
                                })
                    r["horario"] = horario
                    data_periodo.append(r)

                except Exception as e:
                    raise ValueError(f"Error scraping fila en {nombre_sede} ({año}-{semestre}): {e}") from e
        
        periodos.append([f"{año}-{semestre}", data_periodo])
        semestre -= 1
        if semestre < 1: año -= 1; semestre += 3

    return [nombre_sede, nombre_jornada, periodos]

def get_programas_academicos():
    html = BeautifulSoup(
        requests.get(url="https://siga.usm.cl/prog_oai/oai_academia.jsp").text,
        "html.parser",
    )
    data = {}

    sedes = {}
    for option in html.find_all("select")[0].find_all("option"):
        value = option["value"].strip()
        if value == "-1":
            continue
        sedes[" ".join(option.stripped_strings).strip()] = value

    for sede in sedes.keys():
        data[sede] = {}

    for [sede, sede_cod] in sedes.items():
        departamentos = {}
        html = BeautifulSoup(
            requests.get(
                url=f"https://siga.usm.cl/prog_oai/oai_academia.jsp?sede={sede_cod}",
            ).text,
            "html.parser",
        )

        for option in html.find_all("select")[1].find_all("option"):
            value = option["value"].strip()
            if value == "-1":
                continue
            departamentos[" ".join(option.stripped_strings).strip()] = value

        for departamento in departamentos.keys():
            data[sede][departamento] = {}

        for [departamento, departamento_cod] in departamentos.items():
            html = BeautifulSoup(
                requests.get(
                    url=f"https://siga.usm.cl/prog_oai/oai_academia.jsp?sede={sede_cod}&cod_departamento={departamento_cod}",
                ).text,
                "html.parser",
            )

            tables = ["IMPAR", "PAR", "AMBOS", "ELECTIVO"]
            for type_name in tables:
                data[sede][departamento][type_name] = {}

            i = 0
            for tbody in [element.parent for element in html.select(".LetraAzulTabla")]:
                if i >= len(tables):
                    break
                for row in tbody.find_all("tr")[1:]:
                    td = row.find_all("td")
                    if len(td) != 5:
                        continue

                    [sigla, nombre, creditos, programa, _] = [
                        " ".join(d.stripped_strings).strip() for d in td
                    ]

                    programa = ""
                    for tag in row.find_all():
                        on_click = tag.get("onclick")
                        if on_click:
                            programa = re.findall(r"\'(.*?)\'", on_click)[0]
                            programa = urllib.parse.quote(programa, safe="")

                    data[sede][departamento][tables[i]][sigla] = {
                        "nombre": nombre,
                        "creditos": creditos,
                        "programa": (
                            f"https://siga.usm.cl/prog_oai/programa_download?pdf={programa}"
                            if programa
                            else ""
                        ),
                    }
                i += 1

    return data
