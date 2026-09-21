# -*- coding: utf-8 -*-
"""Generate the ER diagram PNG for the documentation."""
import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

F_REG  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
F_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(sz, bold=False):
    return ImageFont.truetype(F_BOLD if bold else F_REG, sz)
def ar(t):
    return get_display(arabic_reshaper.reshape(t))

W, H = 1500, 1190
img = Image.new('RGB', (W, H), '#FFFFFF')
d = ImageDraw.Draw(img)

IND = '#4338CA'; INDL = '#EEF2FF'; LINE = '#334155'; GRAY = '#64748B'
PKC = '#B45309'; FKC = '#4F46E5'; BADG = '#F1F5F9'

HDR = 46; ROW = 22; PAD = 6; BW = 300

def entity(x, y, en, arname, attrs):
    h = HDR + len(attrs)*ROW + PAD
    # body
    d.rounded_rectangle([x, y, x+BW, y+h], radius=10, fill='white', outline='#94A3B8', width=2)
    # header
    d.rounded_rectangle([x, y, x+BW, y+HDR], radius=10, fill=IND)
    d.rectangle([x, y+HDR-12, x+BW, y+HDR], fill=IND)
    d.text((x+12, y+7), en, font=font(17, True), fill='white')
    d.text((x+12, y+25), ar(arname), font=font(14), fill='#E0E7FF')
    # attributes
    for i, (name, tag) in enumerate(attrs):
        ry = y + HDR + 6 + i*ROW
        if i % 2 == 1:
            d.rectangle([x+1, ry-4, x+BW-1, ry+ROW-6], fill='#F8FAFC')
        if tag == 'PK':
            d.text((x+12, ry-3), name, font=font(14, True), fill='#111827')
            bx = x+BW-52
            d.rounded_rectangle([bx, ry-4, x+BW-8, ry+ROW-8], radius=4, fill='#FEF3C7')
            d.text((bx+13, ry-3), 'PK', font=font(12, True), fill=PKC)
        elif tag == 'FK':
            d.text((x+12, ry-3), name, font=font(14), fill=FKC)
            bx = x+BW-52
            d.rounded_rectangle([bx, ry-4, x+BW-8, ry+ROW-8], radius=4, fill=INDL)
            d.text((bx+13, ry-3), 'FK', font=font(12, True), fill=FKC)
        else:
            d.text((x+12, ry-3), name, font=font(14), fill='#334155')
    return h

def rel(p1, p2, label, w=3):
    d.line([p1, p2], fill=LINE, width=w)
    mx, my = (p1[0]+p2[0])//2, (p1[1]+p2[1])//2
    t = ar(label)
    tw = d.textlength(t, font=font(14))
    d.rounded_rectangle([mx-tw/2-7, my-24, mx+tw/2+7, my-2], radius=5, fill='white', outline='#CBD5E1', width=1)
    d.text((mx-tw/2, my-22), t, font=font(14), fill=LINE)

# ---------------- boxes ----------------
h_school = entity(760, 30, 'schools', 'المدرسة', [
    ('id', 'PK'), ('name', None), ('type', None), ('city', None),
    ('phone', None), ('year_label', None), ('max_per_section', None)])
h_path = entity(430, 270, 'paths', 'المسار الدراسي', [
    ('id', 'PK'), ('school_id', 'FK'), ('name', None)])
h_stage = entity(90, 430, 'stages', 'المرحلة', [
    ('id', 'PK'), ('path_id', 'FK'), ('name', None)])
h_subj = entity(430, 430, 'subjects', 'المادة', [
    ('id', 'PK'), ('path_id', 'FK'), ('name', None)])
h_level = entity(90, 590, 'levels', 'المستوى (الصف)', [
    ('id', 'PK'), ('stage_id', 'FK'), ('name', None)])
h_teach = entity(760, 540, 'teachers', 'المعلم', [
    ('id', 'PK'), ('name', None), ('subject', None), ('phone', None), ('max_sections', None)])
h_sec = entity(430, 830, 'sections', 'الشعبة', [
    ('id', 'PK'), ('year_label', None), ('level_id', 'FK'),
    ('letter', None), ('max_students', None), ('teacher_id', 'FK')])
h_stud = entity(800, 830, 'students', 'الطالب', [
    ('id', 'PK'), ('name', None), ('gender', None), ('path_id', 'FK'),
    ('level_id', 'FK'), ('parent_id', 'FK'), ('section_id', 'FK')])
h_par = entity(1160, 850, 'parents', 'ولي الأمر', [
    ('id', 'PK'), ('name', None), ('phone', None), ('gender', None)])

# ---------------- relations ----------------
rel((910, 30+h_school), (580, 270), 'المسارات المتوفرة (1 : N)')
rel((500, 270+h_path), (240, 430), 'مراحل المسار (1 : N)')
rel((600, 270+h_path), (575, 430), 'مواد المسار (1 : N)')
rel((240, 430+h_stage), (240, 590), 'مستويات المرحلة (1 : N)')
rel((300, 590+h_level), (500, 830), 'شعب المستوى لكل عام (1 : N)')
rel((390, 590+h_level), (845, 830), 'تسجيل الطلاب بالمستوى (1 : N)')
rel((830, 540+h_teach), (590, 830), 'مربّي الصف (1 : N)')
rel((1160, 850+h_par//2), (1100, 830+h_stud//2), 'الأبناء (1 : N)')
p_s = (800, 830+h_stud//2+20); p_c = (730, 830+h_sec//2+20)
d.line([p_s, p_c], fill=LINE, width=3)
t = ar('التوزيع')
tw = d.textlength(t, font=font(14))
mx, my = (p_s[0]+p_c[0])//2, (p_s[1]+p_c[1])//2
d.rounded_rectangle([mx-tw/2-6, my-24, mx+tw/2+6, my-2], radius=5, fill='white', outline='#CBD5E1')
d.text((mx-tw/2, my-22), t, font=font(14), fill=LINE)
d.text((736, my+6), 'N', font=font(15, True), fill=IND)
d.text((792, my+6), '0..1', font=font(15, True), fill=IND)

# ---------------- legend ----------------
ly = 1060
d.rounded_rectangle([90, ly, 760, ly+48], radius=8, fill='#F8FAFC', outline='#CBD5E1')
leg1 = ar('PK = مفتاح أساسي    FK = مفتاح خارجي    حقول بمفتاح خارجي قد تكون فارغة (null)')
d.text((110, ly+13), leg1, font=font(15), fill='#334155')
leg2 = ar('الشعبة تُحدَّد بـ: العام + المستوى + الحرف (أ، ب، ج…) — لا يتكرر حرف ضمن مستوى واحد في عام واحد')
d.text((110, ly+70), leg2, font=font(15), fill=GRAY)

img.save('/home/user/school-wizard/er_diagram.png', dpi=(150, 150))
print('ER saved', img.size)
