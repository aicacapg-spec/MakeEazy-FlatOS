'use client'

// ═══════════════════════════════════════════════════════════════════════
// COMPREHENSIVE AGREEMENT PDF GENERATOR
// Based on UVPL Master Leave & License Agreement format
// Includes: Full clauses, Annexure-I (Inventory), Annexure-II (Rules),
//           Annexure-III (KYC Checklist), Stamping & Registration notes
// ═══════════════════════════════════════════════════════════════════════

interface AgreementData {
  // Licensor
  licensorName: string
  licensorPAN: string
  licensorAddress: string
  licensorDirector: string
  // Licensee(s)
  licensees: { name: string; pan: string; aadhaar: string; phone: string; email: string }[]
  // Property
  flatNumber: string
  floor: string
  propertyName: string
  propertyAddress: string
  carpetAreaSqft: number
  furnishing: string
  // Terms
  startDate: string
  endDate: string
  monthlyRent: number
  monthlyMaintenance: number
  securityDeposit: number
  lockInMonths: number
  noticePeriodMonths: number
  escalationPercent: number
  rentDueDay: number
  gracePeriodDays: number
  lateFeePercent: number
  // Inventory (for Annexure-I)
  inventory: { item: string; qty: number; condition: string }[]
  // Agreement date
  agreementDate: string
}

const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

function numberToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (n === 0) return 'Zero'
  if (n < 0) return 'Minus ' + numberToWords(-n)
  if (n < 20) return ones[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numberToWords(n % 100) : '')
  if (n < 100000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '')
  if (n < 10000000) return numberToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWords(n % 100000) : '')
  return numberToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numberToWords(n % 10000000) : '')
}

const fmtD = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
const durationMonths = (s: string, e: string) => Math.round((new Date(e).getTime() - new Date(s).getTime()) / (1000 * 60 * 60 * 24 * 30))

const CSS = `
@media print { @page { margin: 2cm 2.5cm; size: A4; } body { font-size: 12pt; } .print-btn, .no-print { display:none!important; } }
body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 13pt; line-height: 1.8; color: #1a1a1a; max-width: 720px; margin: 0 auto; padding: 40px 24px; }
h1 { text-align:center; font-size:18pt; text-decoration:underline; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; }
h2 { font-size:14pt; text-decoration:underline; margin:28px 0 10px; page-break-after:avoid; }
h3 { font-size:13pt; margin:20px 0 8px; }
.sub { text-align:center; font-size:11pt; color:#555; margin-bottom:30px; }
.clause { margin-bottom:14px; text-align:justify; }
.clause-num { font-weight:bold; }
.b { font-weight:bold; }
.u { text-decoration:underline; }
table { width:100%; border-collapse:collapse; margin:14px 0; }
th,td { border:1px solid #444; padding:7px 10px; font-size:11.5pt; text-align:left; }
th { background:#f0f0f0; font-weight:bold; }
.center { text-align:center; }
.sig-block { margin-top:50px; display:flex; justify-content:space-between; page-break-inside:avoid; }
.sig-col { width:45%; text-align:center; }
.sig-line { border-top:1px solid #333; margin-top:60px; padding-top:8px; }
.stamp { border:2px dashed #999; padding:16px; text-align:center; margin:20px 0; color:#666; font-style:italic; font-size:11pt; }
.footer-gen { margin-top:30px; font-size:9pt; color:#888; text-align:center; border-top:1px solid #ddd; padding-top:12px; }
.witness { page-break-inside:avoid; }
.page-break { page-break-before:always; }
.annexure-title { text-align:center; font-size:16pt; font-weight:bold; margin:20px 0 6px; text-decoration:underline; }
.annexure-sub { text-align:center; font-size:11pt; color:#555; margin-bottom:20px; }
ol.clauses { counter-reset:clause; padding:0; list-style:none; }
ol.clauses > li { counter-increment:clause; margin-bottom:14px; text-align:justify; }
ol.clauses > li::before { content:counter(clause) ". "; font-weight:bold; }
.print-btn { position:fixed; top:16px; right:16px; padding:12px 28px; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:10px; cursor:pointer; font-size:14px; font-weight:700; z-index:999; box-shadow:0 4px 16px rgba(99,102,241,0.4); display:flex; align-items:center; gap:8px; }
.print-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,0.5); }
.checklist td:first-child { width:28px; text-align:center; }
`

export function generateAgreementHTML(data: AgreementData): string {
  const dur = durationMonths(data.startDate, data.endDate)
  const totalMonthly = data.monthlyRent + data.monthlyMaintenance

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Leave & License Agreement — Flat ${data.flatNumber} | ${data.licensorName}</title>
<style>${CSS}</style></head><body>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

<!-- ═══════════ MAIN AGREEMENT ═══════════ -->
<h1>Leave and License Agreement</h1>
<p class="sub">(Under Section 52 of the Indian Easements Act, 1882 read with<br>Maharashtra Rent Control Act, 1999 / Telangana Buildings (Lease, Rent and Eviction) Control Act, 1960)</p>

<p class="clause">This <span class="b">LEAVE AND LICENSE AGREEMENT</span> ("Agreement") is made and executed on this
<span class="b u">${fmtD(data.agreementDate)}</span> at Hyderabad, Telangana.</p>

<!-- PARTIES -->
<h2>BETWEEN</h2>
<p class="clause">
<span class="b">${data.licensorName}</span>${data.licensorPAN ? ` (PAN: ${data.licensorPAN})` : ''},
having its registered office at ${data.licensorAddress},
represented by its authorized signatory <span class="b">${data.licensorDirector}</span>,
hereinafter referred to as the <span class="b u">"LICENSOR"</span> (which expression shall, unless repugnant to the
context or meaning thereof, include its successors, legal representatives, administrators, and assigns)
of the <span class="b">FIRST PART</span>;
</p>

<p class="center b" style="margin:16px 0;">— AND —</p>

${data.licensees.map((l, i) => `<p class="clause">
<span class="b">${i + 1}. ${l.name}</span>${l.pan ? ` (PAN: ${l.pan})` : ''}${l.aadhaar ? `, Aadhaar: ${l.aadhaar}` : ''},
${l.phone ? `Contact: ${l.phone}` : ''}${l.email ? `, Email: ${l.email}` : ''},
hereinafter referred to as <span class="b u">"LICENSEE ${data.licensees.length > 1 ? (i + 1) : ''}"</span>
of the <span class="b">SECOND PART</span>;
</p>`).join('')}

<p class="clause" style="font-size:11pt;color:#555;">(The Licensor and Licensee(s) are hereinafter individually referred to as a "Party" and collectively as "Parties")</p>

<!-- RECITALS -->
<h2>RECITALS</h2>
<p class="clause"><span class="b">WHEREAS</span>, the Licensor is the absolute and lawful owner of the residential apartment bearing
<span class="b">Flat No. ${data.flatNumber}</span>, situated on <span class="b">${data.floor} Floor</span>,
in the building known as <span class="b">"${data.propertyName}"</span>,
located at ${data.propertyAddress}
(carpet area approximately <span class="b">${data.carpetAreaSqft} sq. ft.</span>,
<span class="b">${data.furnishing}</span> furnished),
hereinafter referred to as the <span class="b u">"Licensed Premises"</span>.</p>

<p class="clause"><span class="b">AND WHEREAS</span>, the Licensee(s) has/have approached the Licensor for grant of Leave and License
of the Licensed Premises for residential use, and the Licensor has agreed to grant the same on the
terms and conditions hereinafter mentioned.</p>

<p class="clause"><span class="b">NOW THEREFORE</span>, in consideration of the mutual covenants and agreements herein contained,
the Parties agree as follows:</p>

<!-- TERMS AND CONDITIONS -->
<h2>TERMS AND CONDITIONS</h2>
<ol class="clauses">

<li><span class="b">TERM & COMMENCEMENT:</span>
This Agreement shall be for a period of <span class="b">${dur} (${numberToWords(dur)}) months</span>,
commencing from <span class="b">${fmtD(data.startDate)}</span>
and expiring on <span class="b">${fmtD(data.endDate)}</span>,
unless terminated earlier or renewed by mutual written consent of both Parties.</li>

<li><span class="b">LICENSE FEE:</span>
The Licensee(s) shall pay a monthly license fee to the Licensor as detailed below:
<table>
<tr><th>Component</th><th>Amount (₹/month)</th><th>Amount in Words</th></tr>
<tr><td>License Fee (Rent)</td><td class="b">${fmt(data.monthlyRent)}</td><td>${numberToWords(data.monthlyRent)} Rupees Only</td></tr>
<tr><td>Maintenance Charges</td><td>${fmt(data.monthlyMaintenance)}</td><td>${numberToWords(data.monthlyMaintenance)} Rupees Only</td></tr>
<tr style="background:#f0f0f0"><td class="b">Total Monthly Payable</td><td class="b">${fmt(totalMonthly)}</td><td class="b">${numberToWords(totalMonthly)} Rupees Only</td></tr>
<tr><td colspan="3" style="font-size:10pt;color:#555">Annual License Fee Value: ${fmt(data.monthlyRent * 12)} (${numberToWords(data.monthlyRent * 12)} Rupees Only)</td></tr>
</table></li>

<li><span class="b">SECURITY DEPOSIT:</span>
The Licensee(s) shall pay a refundable interest-free security deposit of
<span class="b">${fmt(data.securityDeposit)}</span>
(${numberToWords(data.securityDeposit)} Rupees Only)
to the Licensor prior to taking possession of the Licensed Premises.
The security deposit shall be refunded within <span class="b">30 (Thirty) days</span>
of the Licensee(s) vacating the premises and handing over peaceful vacant possession,
after deducting any outstanding license fee, utility bills, maintenance charges, damages
(beyond normal wear and tear), or any other amounts due under this Agreement.</li>

<li><span class="b">LOCK-IN PERIOD:</span>
There shall be a lock-in period of <span class="b">${data.lockInMonths} (${numberToWords(data.lockInMonths)}) months</span>
from the date of commencement. During the lock-in period, neither Party shall terminate this
Agreement. If the Licensee(s) vacate(s) the premises during the lock-in period, the Licensee(s)
shall forfeit the security deposit equivalent to the unexpired lock-in tenure.</li>

<li><span class="b">NOTICE PERIOD:</span>
After the expiry of the lock-in period, either Party may terminate this Agreement by giving
<span class="b">${data.noticePeriodMonths} (${numberToWords(data.noticePeriodMonths)}) month(s)</span>
prior written notice to the other Party. The notice must be served via email or registered post.</li>

<li><span class="b">ESCALATION:</span>
The license fee shall be subject to an escalation of
<span class="b">${data.escalationPercent}% (${numberToWords(data.escalationPercent)} percent)</span>
per annum on the then prevailing rent, effective upon completion of each twelve-month period
from the date of commencement or upon renewal, whichever is applicable.</li>

<li><span class="b">PAYMENT TERMS:</span>
<ul style="margin-top:6px">
<li>The license fee shall be payable on or before the <span class="b">${data.rentDueDay}${data.rentDueDay === 1 ? 'st' : data.rentDueDay === 2 ? 'nd' : data.rentDueDay === 3 ? 'rd' : 'th'} of every calendar month</span>.</li>
<li>A grace period of <span class="b">${data.gracePeriodDays} (${numberToWords(data.gracePeriodDays)}) days</span> is permitted.</li>
<li>Payment beyond the grace period shall attract <span class="b">simple interest at ${data.lateFeePercent}% per annum</span>, calculated daily from the ${data.rentDueDay + data.gracePeriodDays}th day of the month.</li>
<li>Payment shall be made via NEFT/RTGS/UPI/cheque to the Licensor's designated bank account.</li>
</ul></li>

<li><span class="b">TDS OBLIGATION:</span>
The Licensee(s) shall deduct TDS at the applicable rate under Section 194-IB of the Income Tax Act, 1961,
on the license fee paid, if the aggregate annual rent exceeds ₹50,000 per month. The Licensee(s) shall
furnish Form 26QC and provide Form 16C to the Licensor within the prescribed timeline.</li>

<li><span class="b">PURPOSE OF USE:</span>
The Licensed Premises shall be used <span class="b">exclusively for residential purposes</span> by the Licensee(s)
and their immediate family members only. The premises shall not be used for any commercial, illegal,
immoral, or unlawful activity.</li>

<li><span class="b">MAINTENANCE & REPAIRS:</span>
<ul style="margin-top:6px">
<li>The Licensee(s) shall maintain the Licensed Premises in clean, hygienic, and good habitable condition.</li>
<li>Minor repairs (up to ₹2,000 per instance) shall be borne by the Licensee(s).</li>
<li>Major structural repairs and maintenance of fixed installations shall be the responsibility of the Licensor.</li>
<li>The Licensee(s) shall not make any structural alteration, modification, or addition without prior written consent.</li>
</ul></li>

<li><span class="b">UTILITIES & SERVICES:</span>
Electricity, water, gas (piped/cylinder), internet, DTH/cable, and any other utility charges shall be
borne entirely by the Licensee(s) and paid directly to the respective service providers.
Society maintenance charges are included in the monthly payable as stated in Clause 2.</li>

<li><span class="b">SUBLETTING & ASSIGNMENT:</span>
The Licensee(s) shall <span class="b u">NOT</span> sublet, assign, transfer, or part with the possession of the Licensed
Premises or any part thereof to any third party, whether for consideration or otherwise, without the
prior written consent of the Licensor.</li>

<li><span class="b">INSPECTION:</span>
The Licensor or their authorized representative shall have the right to inspect the Licensed Premises
upon giving <span class="b">24 hours prior written notice</span> to the Licensee(s), between 10:00 AM and 6:00 PM on
any working day.</li>

<li><span class="b">INVENTORY:</span>
The list of fixtures, fittings, furniture, and appliances provided with the Licensed Premises is attached
as <span class="b">Annexure-I</span> to this Agreement. The Licensee(s) shall return all items in the same condition
(allowing for normal wear and tear) upon vacating.</li>

<li><span class="b">SOCIETY RULES:</span>
The Licensee(s) shall abide by all rules, regulations, and bye-laws of the housing society/apartment
complex as specified in <span class="b">Annexure-II</span>. Any penalties imposed by the society due to the
Licensee(s)' conduct shall be borne by the Licensee(s).</li>

<li><span class="b">REPLACEMENT OF LICENSEE:</span>
In case the Licensee(s) wish(es) to add, remove, or replace any co-licensee during the term,
the same shall require prior written approval of the Licensor, execution of a fresh/supplementary agreement,
and payment of applicable charges, if any.</li>

<li><span class="b">TERMINATION:</span>
<ul style="margin-top:6px">
<li>Upon expiry or termination, the Licensee(s) shall vacate the premises and hand over peaceful vacant
possession with all keys, access cards, parking remotes, and fittings in good working condition.</li>
<li>The Licensee(s) shall settle all outstanding utility bills and dues before vacating.</li>
<li>A joint move-out inspection shall be conducted within 3 days of vacating.</li>
</ul></li>

<li><span class="b">INDEMNITY:</span>
The Licensee(s) shall indemnify and keep indemnified the Licensor against all losses, damages, costs,
claims, and proceedings arising out of any breach of this Agreement or any act, default, or negligence
of the Licensee(s).</li>

<li><span class="b">FORCE MAJEURE:</span>
Neither Party shall be liable for non-performance due to causes beyond their reasonable control,
including but not limited to natural disasters, epidemic/pandemic, government orders, war, or civil unrest.</li>

<li><span class="b">DISPUTE RESOLUTION:</span>
Any dispute arising out of or in connection with this Agreement shall first be attempted to be resolved
through mutual discussion. Failing which, the matter shall be referred to a sole arbitrator appointed
by mutual consent under the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be
<span class="b">Hyderabad, Telangana</span>.</li>

<li><span class="b">GOVERNING LAW & JURISDICTION:</span>
This Agreement shall be governed by and construed in accordance with the laws of India.
The courts at <span class="b">Hyderabad</span> shall have exclusive jurisdiction.</li>

<li><span class="b">ENTIRE AGREEMENT:</span>
This Agreement (including all Annexures) constitutes the entire agreement between the Parties
and supersedes all prior negotiations, understandings, and agreements. No modification shall be
valid unless made in writing and signed by both Parties.</li>

</ol>

<!-- STAMP & REGISTRATION -->
<div class="stamp">
[ Stamp Duty: ₹100 Non-Judicial Stamp Paper / e-Stamp ]<br>
[ Registration: To be registered at Sub-Registrar Office, Hyderabad, if term exceeds 11 months ]
</div>

<p class="clause center b" style="margin-top:30px;">
IN WITNESS WHEREOF, the Parties hereto have set their respective hands and signatures
on the day, month, and year first above written.
</p>

<!-- SIGNATURES -->
<div class="sig-block">
<div class="sig-col">
<div class="sig-line">
<span class="b">LICENSOR</span><br>
For ${data.licensorName}<br>
${data.licensorDirector}<br>
(Authorized Signatory)
</div>
</div>
<div class="sig-col">
<div class="sig-line">
<span class="b">LICENSEE(S)</span><br>
${data.licensees.map((l, i) => `${i + 1}. ${l.name}`).join('<br>')}
</div>
</div>
</div>

<!-- WITNESSES -->
<div class="witness" style="margin-top:40px;">
<h2>WITNESSES</h2>
<div style="display:flex;justify-content:space-between;margin-top:20px;">
<div style="width:45%">
<p>1. Name: ___________________________</p>
<p>&nbsp;&nbsp;&nbsp;Address: ___________________________</p>
<p>&nbsp;&nbsp;&nbsp;Signature: ___________________________</p>
</div>
<div style="width:45%">
<p>2. Name: ___________________________</p>
<p>&nbsp;&nbsp;&nbsp;Address: ___________________________</p>
<p>&nbsp;&nbsp;&nbsp;Signature: ___________________________</p>
</div>
</div>
</div>

<!-- ═══════════ ANNEXURE I — INVENTORY ═══════════ -->
<div class="page-break"></div>
<div class="annexure-title">ANNEXURE — I</div>
<div class="annexure-sub">Inventory of Fixtures, Fittings, Furniture & Appliances<br>
(Flat No. ${data.flatNumber}, ${data.propertyName})</div>

${data.inventory.length > 0 ? `
<table>
<tr><th>#</th><th>Item Description</th><th>Qty</th><th>Condition at Handover</th></tr>
${data.inventory.map((item, i) => `<tr><td>${i + 1}</td><td>${item.item}</td><td>${item.qty}</td><td>${item.condition}</td></tr>`).join('')}
</table>` : `
<table>
<tr><th>#</th><th>Item Description</th><th>Qty</th><th>Condition</th></tr>
<tr><td>1</td><td>Split AC (1.5 Ton)</td><td>___</td><td>Working</td></tr>
<tr><td>2</td><td>Ceiling Fan</td><td>___</td><td>Working</td></tr>
<tr><td>3</td><td>Geyser (Water Heater)</td><td>___</td><td>Working</td></tr>
<tr><td>4</td><td>Exhaust Fan</td><td>___</td><td>Working</td></tr>
<tr><td>5</td><td>Wardrobe / Cupboard</td><td>___</td><td>Good</td></tr>
<tr><td>6</td><td>Modular Kitchen (with hob, chimney)</td><td>1</td><td>Good</td></tr>
<tr><td>7</td><td>Bed with Mattress</td><td>___</td><td>Good</td></tr>
<tr><td>8</td><td>Dining Table with Chairs</td><td>___</td><td>Good</td></tr>
<tr><td>9</td><td>Curtain Rods & Curtains</td><td>___</td><td>Good</td></tr>
<tr><td>10</td><td>TV Unit</td><td>___</td><td>Good</td></tr>
<tr><td>11</td><td>Washing Machine</td><td>___</td><td>Working</td></tr>
<tr><td>12</td><td>Refrigerator</td><td>___</td><td>Working</td></tr>
<tr><td>13</td><td>Keys & Access Cards</td><td>___</td><td>—</td></tr>
<tr><td>14</td><td>Parking Remote / Sticker</td><td>___</td><td>—</td></tr>
</table>`}

<p style="font-size:11pt;margin-top:16px;">Condition Key: <b>Working</b> = Fully functional | <b>Good</b> = Minor wear | <b>Fair</b> = Usable with wear | <b>Damaged</b> = Needs repair</p>

<div class="sig-block" style="margin-top:30px;">
<div class="sig-col"><div class="sig-line">Licensor's Signature</div></div>
<div class="sig-col"><div class="sig-line">Licensee's Signature</div></div>
</div>

<!-- ═══════════ ANNEXURE II — SOCIETY RULES ═══════════ -->
<div class="page-break"></div>
<div class="annexure-title">ANNEXURE — II</div>
<div class="annexure-sub">Society / Complex Rules & Regulations</div>

<ol style="line-height:2;font-size:12pt;">
<li>Maintain silence between 10:00 PM and 7:00 AM. No loud music, parties, or construction activity during these hours.</li>
<li>Pets are allowed only with prior written permission from the society. Pet owners must ensure cleanliness of common areas.</li>
<li>Parking spaces are allotted and must not be used by unauthorized vehicles. Visitor parking is available on first-come basis.</li>
<li>Common areas (lobby, lifts, staircase, gym, pool) must be used responsibly. Any damage shall be charged to the responsible resident.</li>
<li>Waste segregation is mandatory — dry waste, wet waste, and hazardous waste must be separated.</li>
<li>No commercial or business activity is permitted within the residential premises.</li>
<li>Any renovation, painting, or structural modification requires prior written NOC from the society management.</li>
<li>CCTV surveillance is operational in common areas for security purposes.</li>
<li>Domestic staff must be registered with the society office along with valid ID proof and police verification.</li>
<li>Fire safety equipment must not be tampered with. Emergency exits must be kept clear at all times.</li>
<li>All residents must register with the local police station as per TGPF regulations within 24 hours of occupancy.</li>
<li>The society management committee's decision on disputes regarding common areas shall be final and binding.</li>
</ol>

<!-- ═══════════ ANNEXURE III — KYC CHECKLIST ═══════════ -->
<div class="page-break"></div>
<div class="annexure-title">ANNEXURE — III</div>
<div class="annexure-sub">KYC & Onboarding Document Checklist</div>

<table class="checklist">
<tr><th>✓</th><th>Document</th><th>Submitted</th><th>Verified By</th></tr>
<tr><td>☐</td><td>Aadhaar Card (self-attested copy)</td><td>___/___/______</td><td>___________</td></tr>
<tr><td>☐</td><td>PAN Card (self-attested copy)</td><td>___/___/______</td><td>___________</td></tr>
<tr><td>☐</td><td>Passport-size Photographs (2 nos.)</td><td>___/___/______</td><td>___________</td></tr>
<tr><td>☐</td><td>Employment / Offer Letter</td><td>___/___/______</td><td>___________</td></tr>
<tr><td>☐</td><td>Latest 3-month Salary Slips</td><td>___/___/______</td><td>___________</td></tr>
<tr><td>☐</td><td>Police Verification Application</td><td>___/___/______</td><td>___________</td></tr>
<tr><td>☐</td><td>Rental Application Form</td><td>___/___/______</td><td>___________</td></tr>
<tr><td>☐</td><td>Move-in Inspection Report (signed)</td><td>___/___/______</td><td>___________</td></tr>
<tr><td>☐</td><td>Security Deposit Receipt</td><td>___/___/______</td><td>___________</td></tr>
<tr><td>☐</td><td>Signed Copy of This Agreement</td><td>___/___/______</td><td>___________</td></tr>
<tr><td>☐</td><td>Emergency Contact Details</td><td>___/___/______</td><td>___________</td></tr>
</table>

<div class="sig-block" style="margin-top:30px;">
<div class="sig-col"><div class="sig-line">Licensor / Property Manager</div></div>
<div class="sig-col"><div class="sig-line">Licensee Acknowledgment</div></div>
</div>

<div class="footer-gen">
Generated by <b>MakeEazy FlatOS</b> · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} · Draft for review — not a legally binding document until duly stamped, signed, and registered.
</div>

</body></html>`
}

// ═══════════ RENT RECEIPT TEMPLATE ═══════════
export function generateRentReceiptHTML(data: {
  receiptNumber: string
  date: string
  tenantName: string
  flatNumber: string
  propertyName: string
  month: string
  rentAmount: number
  maintenanceAmount: number
  lateFee: number
  totalPaid: number
  paymentMode: string
  referenceNumber: string
  landlordName: string
  landlordPAN: string
}): string {
  const total = data.rentAmount + data.maintenanceAmount + data.lateFee
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Rent Receipt ${data.receiptNumber}</title>
<style>
@media print { @page { margin:1.5cm; size:A5 landscape; } .print-btn{display:none!important;} }
body{font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;color:#1a1a1a;}
.receipt{border:2px solid #6366f1;border-radius:12px;padding:28px;position:relative;overflow:hidden;}
.receipt::before{content:'';position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#6366f1);}
.receipt-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:1px dashed #ddd;}
.receipt-title{font-size:20px;font-weight:800;color:#6366f1;}
.receipt-sub{font-size:11px;color:#64748b;}
.receipt-no{text-align:right;}
.receipt-no .no{font-size:16px;font-weight:700;color:#1a1a1a;}
.receipt-no .dt{font-size:12px;color:#64748b;}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;}
.detail-label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;}
.detail-value{font-size:14px;font-weight:600;}
table{width:100%;border-collapse:collapse;margin:16px 0;}
td,th{padding:8px 12px;text-align:left;font-size:13px;}
th{background:#f8fafc;border-bottom:2px solid #e2e8f0;font-size:11px;text-transform:uppercase;color:#64748b;}
.total-row{background:#eef2ff;font-weight:700;font-size:15px;}
.total-row td{color:#6366f1;}
.words{font-size:12px;color:#64748b;font-style:italic;margin:8px 0 16px;}
.sig-area{display:flex;justify-content:space-between;margin-top:30px;padding-top:16px;border-top:1px solid #e2e8f0;}
.sig-box{text-align:center;font-size:12px;color:#64748b;}
.sig-box .line{width:160px;border-top:1px solid #333;margin:40px auto 4px;}
.stamp-box{font-size:10px;color:#999;text-align:center;margin-top:16px;padding:8px;border:1px dashed #ddd;border-radius:6px;}
.print-btn{position:fixed;top:16px;right:16px;padding:10px 24px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;box-shadow:0 4px 12px rgba(99,102,241,0.3);}
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
<div class="receipt">
<div class="receipt-header">
<div>
<div class="receipt-title">RENT RECEIPT</div>
<div class="receipt-sub">${data.propertyName}</div>
</div>
<div class="receipt-no">
<div class="no">${data.receiptNumber}</div>
<div class="dt">${new Date(data.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
</div>
</div>

<div class="detail-grid">
<div><div class="detail-label">Received From</div><div class="detail-value">${data.tenantName}</div></div>
<div><div class="detail-label">For the Month of</div><div class="detail-value">${data.month}</div></div>
<div><div class="detail-label">Flat Number</div><div class="detail-value">${data.flatNumber}</div></div>
<div><div class="detail-label">Payment Mode</div><div class="detail-value">${data.paymentMode.toUpperCase()}${data.referenceNumber ? ` (${data.referenceNumber})` : ''}</div></div>
</div>

<table>
<tr><th>Description</th><th style="text-align:right">Amount (₹)</th></tr>
<tr><td>Monthly Rent / License Fee</td><td style="text-align:right">${fmt(data.rentAmount)}</td></tr>
<tr><td>Maintenance Charges</td><td style="text-align:right">${fmt(data.maintenanceAmount)}</td></tr>
${data.lateFee > 0 ? `<tr><td>Late Fee / Interest</td><td style="text-align:right;color:#dc2626">${fmt(data.lateFee)}</td></tr>` : ''}
<tr class="total-row"><td>Total Received</td><td style="text-align:right">${fmt(data.totalPaid)}</td></tr>
</table>

<div class="words">Amount in words: <b>${numberToWords(data.totalPaid)} Rupees Only</b></div>

${total > data.totalPaid ? `<p style="font-size:12px;color:#dc2626;font-weight:600;">⚠ Balance Due: ${fmt(total - data.totalPaid)}</p>` : ''}

<div class="sig-area">
<div class="sig-box"><div class="line"></div>Tenant Signature</div>
<div class="sig-box"><div class="line"></div>For ${data.landlordName}<br>${data.landlordPAN ? `PAN: ${data.landlordPAN}` : '(Authorized Signatory)'}</div>
</div>

<div class="stamp-box">
This is a computer-generated receipt. ${data.totalPaid >= 5000 ? 'Revenue stamp of ₹1 affixed.' : 'No stamp required for amount below ₹5,000.'}
</div>
</div>
</body></html>`
}
