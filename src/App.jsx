import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* ============================================================
   ENGINEER·DLE — daily progressive-clue engineering puzzle.
   100 puzzles. One per day. Wrong guess or skip unlocks a clue.
   ============================================================ */

const store = {
  get: async (k) => {
    const v = localStorage.getItem(k);
    if (v === null) throw new Error("not found");
    return { key: k, value: v };
  },
  set: async (k, v) => { localStorage.setItem(k, v); return { key: k, value: v }; },
};

const MAX_GUESSES = 5;

const PUZZLES = [
  { answer: "Bernoulli's Principle", discipline: "Fluid Mechanics", accept: ["bernoulli", "bernoullis principle", "bernoulli equation"], clues: ["It links two properties of a moving fluid that most people assume are unrelated.", "It falls out of conservation of energy applied along a streamline.", "Speed the flow up and something else must come down to compensate.", "It explains why a shower curtain pulls inward and how a carburettor draws fuel.", "Named after a Swiss mathematician from a famously argumentative family of mathematicians."], reveal: "Along a streamline in steady, incompressible, inviscid flow, increased velocity produces decreased static pressure." },
  { answer: "Navier-Stokes Equations", discipline: "Fluid Mechanics", accept: ["navier stokes", "navierstokes"], clues: ["A set of coupled nonlinear partial differential equations.", "They are essentially Newton's second law written for a fluid element.", "Every CFD solver on the planet is trying to approximate them.", "Proving smooth solutions always exist in three dimensions is a Millennium Prize Problem.", "Named for a French engineer and an Irish-born British physicist."], reveal: "The governing equations of viscous fluid motion, expressing momentum conservation for a continuum fluid." },
  { answer: "Mohr's Circle", discipline: "Solid Mechanics", accept: ["mohrs circle", "mohr circle"], clues: ["A graphical method, invented long before computers existed.", "It transforms a quantity from one coordinate orientation to another.", "The radius gives maximum shear; the horizontal extremes give the principal values.", "You draw it on axes of normal stress against shear stress.", "Named after a 19th-century German civil engineer."], reveal: "A 2D graphical representation of the stress transformation equations, giving principal stresses and maximum shear directly." },
  { answer: "Euler Buckling", discipline: "Structural Engineering", accept: ["euler buckling", "eulers buckling", "euler critical load", "buckling"], clues: ["A failure mode that has nothing to do with the material yielding.", "It's why a long thin ruler fails long before it crushes.", "The critical load scales with second moment of area and inversely with length squared.", "End conditions change the answer through an effective length factor.", "Named after the most prolific mathematician in history."], reveal: "Sudden lateral instability of a slender column under axial compression, at P_cr = π²EI/(KL)²." },
  { answer: "Kirchhoff's Current Law", discipline: "Electrical Engineering", accept: ["kirchhoffs current law", "kcl", "kirchhoffs first law"], clues: ["One of two laws by the same person that underpin all circuit analysis.", "It is really conservation of charge in disguise.", "It applies at a node, not around a loop.", "What flows in must flow out; the algebraic sum is zero.", "Abbreviated with three letters, the middle one being C."], reveal: "The algebraic sum of currents entering and leaving any node in a circuit is zero." },
  { answer: "Nyquist-Shannon Sampling Theorem", discipline: "Signal Processing", accept: ["nyquist", "nyquist shannon", "sampling theorem", "nyquist theorem"], clues: ["It tells you how often is often enough.", "Violate it and you get aliasing — wagon wheels spinning backwards.", "It sets the lower bound at twice the highest frequency present.", "It's why CD audio is sampled at 44.1 kHz.", "Named for a Swedish-American engineer and the father of information theory."], reveal: "A bandlimited signal can be perfectly reconstructed if sampled at more than twice its highest frequency component." },
  { answer: "Reynolds Number", discipline: "Fluid Mechanics", accept: ["reynolds number", "reynolds"], clues: ["A dimensionless group — no units at all.", "It compares two competing forces inside a flow.", "Below roughly 2300 in a pipe you get one regime; above 4000, another entirely.", "It is the ratio of inertial to viscous forces.", "Named after the British engineer who ran the famous dye-in-a-pipe experiment."], reveal: "Re = ρVL/μ — the ratio of inertial to viscous forces, predicting laminar versus turbulent flow." },
  { answer: "Carnot Cycle", discipline: "Thermodynamics", accept: ["carnot cycle", "carnot"], clues: ["A theoretical construct nobody has ever built.", "It consists of four reversible processes.", "Two isothermal steps and two adiabatic steps.", "Its efficiency depends only on two absolute temperatures.", "It sets the upper limit no real heat engine can beat."], reveal: "The idealised reversible cycle setting maximum possible heat-engine efficiency: η = 1 − T_cold/T_hot." },
  { answer: "Second Law of Thermodynamics", discipline: "Thermodynamics", accept: ["second law of thermodynamics", "2nd law of thermodynamics", "second law"], clues: ["It gives time a direction.", "It's the reason perpetual motion machines of the second kind are impossible.", "It concerns a quantity that never decreases in an isolated system.", "Clausius and Kelvin each wrote their own statement of it.", "The quantity in question is entropy."], reveal: "The total entropy of an isolated system can never decrease; heat cannot spontaneously flow from cold to hot." },
  { answer: "Ohm's Law", discipline: "Electrical Engineering", accept: ["ohms law", "ohm law"], clues: ["Three variables, one triangle every student draws.", "It only holds for a certain class of materials and components.", "Rearranged, it gives you the value of the resistor you need.", "V, I and R.", "Named after a German physicist whose surname became a unit."], reveal: "V = IR — voltage across an ohmic conductor is proportional to the current through it." },
  { answer: "Hooke's Law", discipline: "Solid Mechanics", accept: ["hookes law", "hooke law"], clues: ["First published as an anagram, to claim priority without revealing the result.", "It holds only in the elastic region, up to the proportional limit.", "It's the basis of every spring constant you've ever used.", "Stress is proportional to strain via Young's modulus.", "Named after the 17th-century English polymath who feuded with Newton."], reveal: "Within the elastic limit, deformation is directly proportional to applied load: σ = Eε." },
  { answer: "Von Mises Yield Criterion", discipline: "Materials", accept: ["von mises", "von mises stress", "vonmises", "mises"], clues: ["Every FEA colour plot you've ever shown a manager uses it.", "It reduces a full 3D stress state to a single scalar number.", "It's based on distortion energy, not hydrostatic pressure.", "Ductile metals under pure hydrostatic compression won't fail by it.", "Compare that scalar against yield strength and you have your safety factor."], reveal: "A ductile-failure criterion: yielding begins when distortion energy reaches the level seen at yield in uniaxial tension." },
  { answer: "Fourier Transform", discipline: "Signal Processing", accept: ["fourier transform", "fourier", "fft"], clues: ["It swaps one domain for another.", "Any periodic signal can be built up from sines and cosines.", "A pure tone becomes a single spike.", "Its fast algorithm turned an O(n²) job into O(n log n).", "Named after the French mathematician who also studied heat conduction."], reveal: "A transform decomposing a time-domain signal into its constituent frequency components." },
  { answer: "PID Controller", discipline: "Control Systems", accept: ["pid", "pid controller", "proportional integral derivative"], clues: ["Three terms, three tuning knobs, still the workhorse of industry.", "One term reacts to the present, one to the past, one predicts the future.", "Ziegler and Nichols wrote the classic tuning method for it.", "Too much of the second term and you get windup.", "The letters stand for proportional, integral and derivative."], reveal: "A feedback controller acting on the error signal's present value, accumulated history and rate of change." },
  { answer: "Nyquist Stability Criterion", discipline: "Control Systems", accept: ["nyquist stability criterion", "nyquist criterion", "nyquist plot"], clues: ["It answers a yes/no question by drawing a picture.", "The picture is a contour plotted in the complex plane.", "You count encirclements of one specific point.", "That point sits at minus one on the real axis.", "It tells you whether a closed-loop system will be stable."], reveal: "A graphical test using encirclements of −1 in the complex plane to determine closed-loop stability." },
  { answer: "Wheatstone Bridge", discipline: "Instrumentation", accept: ["wheatstone bridge", "wheatstone"], clues: ["A circuit arrangement over 180 years old, still used daily.", "Four elements arranged in a diamond.", "You look for a null reading in the middle.", "It's how a strain gauge turns deformation into millivolts.", "Named after the English scientist who popularised it, though he didn't invent it."], reveal: "A four-arm bridge circuit that measures unknown resistance precisely by balancing to a null output." },
  { answer: "Strain Gauge", discipline: "Instrumentation", accept: ["strain gauge", "strain gage"], clues: ["A thin foil pattern bonded to a surface.", "Stretch it and its electrical resistance changes.", "Its sensitivity is quoted as a gauge factor, typically around 2.", "You usually need temperature compensation and a bridge circuit to read it.", "It's the sensing element inside almost every load cell."], reveal: "A sensor whose resistance changes with mechanical deformation, used to measure strain and hence stress or load." },
  { answer: "Finite Element Analysis", discipline: "Computational Methods", accept: ["finite element analysis", "fea", "finite element method", "fem"], clues: ["It replaces one impossible problem with thousands of easy ones.", "Mesh quality can matter more than material data.", "Convergence studies exist because the answer depends on discretisation.", "It solves a large sparse system, usually written [K]{u} = {F}.", "Its three-letter abbreviation is on every stress engineer's CV."], reveal: "A numerical method that discretises a continuum into elements to approximate solutions to field problems." },
  { answer: "S-N Curve", discipline: "Materials", accept: ["sn curve", "s n curve", "wohler curve", "stress life curve"], clues: ["Plotted on log axes, sloping downward to the right.", "It concerns failure at stresses below the yield point.", "Steels show a flat asymptote; aluminium alloys do not.", "That flat asymptote is called the endurance limit.", "It's the fundamental design tool for fatigue life."], reveal: "A plot of cyclic stress amplitude against cycles to failure — the basis of stress-life fatigue design." },
  { answer: "Moore's Law", discipline: "Electronics", accept: ["moores law", "moore law"], clues: ["It is an observation and a business target, not a law of physics.", "First stated in a magazine article in 1965.", "The doubling period was later revised to about two years.", "It concerns transistor density on an integrated circuit.", "Named after a co-founder of Intel."], reveal: "The observation that the number of transistors on a chip doubles roughly every two years." },
  { answer: "Bode Plot", discipline: "Control Systems", accept: ["bode plot", "bode", "bode diagram"], clues: ["Two stacked graphs sharing a logarithmic horizontal axis.", "The top one is in decibels, the bottom one in degrees.", "Slopes come in tidy multiples of 20 dB per decade.", "You read gain margin and phase margin straight off it.", "Named after a Bell Labs engineer, and pronounced 'boh-dah'."], reveal: "A frequency-response plot of magnitude and phase against log frequency, used for stability margin analysis." },
  { answer: "Poisson's Ratio", discipline: "Materials", accept: ["poissons ratio", "poisson ratio", "poisson"], clues: ["A dimensionless material property, usually between 0 and 0.5.", "Rubber sits near the top of that range; cork sits near zero.", "It describes what happens in one direction when you pull in another.", "A few exotic auxetic materials have a negative value.", "It's the negative ratio of transverse strain to axial strain."], reveal: "ν = −ε_transverse / ε_axial — how much a material contracts laterally when stretched." },
  { answer: "Euler-Bernoulli Beam Theory", discipline: "Structural Engineering", accept: ["euler bernoulli beam theory", "euler bernoulli", "beam theory"], clues: ["A simplification that ignores one effect entirely.", "It assumes plane sections remain plane and perpendicular to the neutral axis.", "It breaks down for short stubby members, where Timoshenko's version is needed.", "It gives the classic σ = My/I relationship.", "Named after two mathematicians, one Swiss, one blind for his final years."], reveal: "The classical bending theory relating load, shear, moment and deflection while neglecting shear deformation." },
  { answer: "Thermal Runaway", discipline: "Safety", accept: ["thermal runaway"], clues: ["A positive feedback loop with a very bad ending.", "The rate of heat generation outpaces the rate of heat removal.", "It's why battery packs need cell spacing and vent paths.", "Once it starts in one cell it can propagate to its neighbours.", "It's the failure mode behind lithium-ion fires."], reveal: "A self-accelerating exothermic process where rising temperature increases heat generation faster than dissipation." },
  { answer: "Faraday's Law of Induction", discipline: "Electromagnetics", accept: ["faradays law", "faraday law", "faraday"], clues: ["It made the electrical grid possible.", "A stationary magnet in a stationary coil produces nothing at all.", "The induced EMF depends on rate of change, not magnitude.", "Lenz's law adds the minus sign that keeps energy conserved.", "Changing magnetic flux through a loop induces a voltage."], reveal: "A time-varying magnetic flux through a circuit induces an EMF equal to −dΦ/dt." },
  { answer: "Shannon Entropy", discipline: "Information Theory", accept: ["shannon entropy", "information entropy"], clues: ["It borrows its name from thermodynamics but measures something else.", "It is measured in bits.", "A fair coin gives exactly one; a two-headed coin gives zero.", "It sets the theoretical floor on lossless compression.", "H = −Σ p log p."], reveal: "The average information content of a source, setting the minimum bits per symbol for lossless coding." },
  { answer: "Bragg's Law", discipline: "Materials Science", accept: ["braggs law", "bragg law", "bragg"], clues: ["It underpins a whole family of characterisation techniques.", "It concerns constructive interference from parallel planes.", "The spacing it reveals is on the order of ångströms.", "nλ = 2d sin θ.", "A father-and-son pair won a Nobel Prize for it."], reveal: "The condition for constructive interference of X-rays scattered by crystal lattice planes." },
  { answer: "Factor of Safety", discipline: "Design", accept: ["factor of safety", "safety factor", "fos"], clues: ["A number, usually greater than one, that lets engineers sleep at night.", "Aerospace uses low values; lifting equipment uses high ones.", "Critics argue it's really a factor of ignorance.", "It's the ratio of capacity to demand.", "Strength divided by applied stress."], reveal: "The ratio of a structure's capacity to the load actually applied, absorbing uncertainty in both." },
  { answer: "Root Locus", discipline: "Control Systems", accept: ["root locus", "rootlocus"], clues: ["A plot that traces paths as one parameter is swept.", "Branches start at poles and end at zeros, or at infinity.", "Crossing into the right half plane means trouble.", "The parameter being swept is usually loop gain.", "Developed by Walter Evans in the 1940s."], reveal: "A graphical technique showing how closed-loop pole locations migrate as gain varies." },
  { answer: "Bathtub Curve", discipline: "Reliability Engineering", accept: ["bathtub curve", "bath tub curve"], clues: ["It's named for its shape, not its function.", "Three distinct regions across a product's life.", "The middle region is flat and random.", "Burn-in testing exists to skip past the first region.", "It plots failure rate against time."], reveal: "The failure-rate-versus-time curve showing infant mortality, a constant random period, and wear-out." },
  { answer: "Fick's Law of Diffusion", discipline: "Materials", accept: ["ficks law", "fick law", "fick"], clues: ["It has the same mathematical form as two other famous transport laws.", "Flux is proportional to a gradient, with a minus sign.", "Its second form is a partial differential equation in time.", "It governs case hardening and dopant diffusion in silicon.", "The gradient in question is concentration."], reveal: "J = −D dC/dx — diffusive flux is proportional to the negative concentration gradient." },
  { answer: "Bond Graph", discipline: "Systems Modelling", accept: ["bond graph", "bondgraph"], clues: ["A modelling notation, not an equation.", "It treats mechanical, hydraulic and electrical systems in one unified language.", "Every connection carries an effort and a flow whose product is power.", "Half-arrows show the direction of power transfer.", "Developed at MIT by Henry Paynter."], reveal: "A domain-independent graphical modelling method representing energy flow through effort–flow pairs." },
  { answer: "Cavitation", discipline: "Fluid Machinery", accept: ["cavitation"], clues: ["It sounds like gravel rattling through the machine.", "It happens when local pressure drops below a critical threshold.", "It pits and erodes impellers and propeller blades.", "NPSH margin is specified precisely to avoid it.", "Vapour bubbles form, then collapse violently."], reveal: "Formation and violent collapse of vapour bubbles when local pressure falls below the fluid's vapour pressure." },
  { answer: "Gauge R&R", discipline: "Quality Engineering", accept: ["gauge r and r", "gauge rr", "gage rr", "grr", "gauge repeatability and reproducibility"], clues: ["A study you run before you trust any of your measurements.", "It separates variation in the process from variation in the measuring.", "Multiple operators measure multiple parts multiple times.", "Below 10% of tolerance is generally acceptable.", "The two Rs stand for repeatability and reproducibility."], reveal: "A measurement systems analysis quantifying how much observed variation comes from the gauge and its operators." },
  { answer: "Skin Effect", discipline: "Electrical Engineering", accept: ["skin effect", "skin depth"], clues: ["It gets worse as frequency rises.", "It makes the effective resistance of a conductor higher than its DC value.", "It's why high-frequency conductors are sometimes hollow or specially stranded.", "Litz wire exists to defeat it.", "Current crowds toward the outer surface of the conductor."], reveal: "The tendency of alternating current to concentrate near a conductor's surface, raising effective resistance with frequency." },
  { answer: "Stress Concentration Factor", discipline: "Solid Mechanics", accept: ["stress concentration", "kt", "stress raiser"], clues: ["It explains why parts break at holes, fillets and sharp corners.", "It's why you drill a hole at the tip of a crack to arrest it.", "Peterson wrote the standard chart book for it.", "For a circular hole in a wide plate, its value is three.", "It multiplies nominal stress to give local peak stress."], reveal: "K_t — the ratio of peak local stress at a geometric discontinuity to the nominal applied stress." },
  { answer: "Zeroth Law of Thermodynamics", discipline: "Thermodynamics", accept: ["zeroth law", "zeroth law of thermodynamics"], clues: ["It was formalised after the others, hence its odd name.", "It sounds trivially obvious, but nothing else works without it.", "It is a statement about transitivity.", "If A and B each agree with C, then A and B agree with each other.", "It is what makes a thermometer meaningful."], reveal: "Two systems each in thermal equilibrium with a third are in equilibrium with each other — this defines temperature." },
  { answer: "Nusselt Number", discipline: "Heat Transfer", accept: ["nusselt number", "nusselt"], clues: ["Another dimensionless group, this one in heat transfer.", "A value of one means a rather disappointing result.", "It's usually correlated against Reynolds and Prandtl numbers.", "It is the ratio of convective to conductive heat transfer across a boundary.", "Named after a German engineer, and abbreviated Nu."], reveal: "Nu = hL/k — the ratio of convective to conductive heat transfer at a surface." },
  { answer: "Poka-Yoke", discipline: "Manufacturing", accept: ["poka yoke", "pokayoke", "mistake proofing", "error proofing"], clues: ["A Japanese term from the Toyota Production System.", "The philosophy is to make the error physically impossible, not merely discouraged.", "A USB-C connector is a good example; the original USB-A was not.", "Shigeo Shingo formalised it.", "It translates roughly as mistake-proofing."], reveal: "Designing a process or part so an error cannot be made, rather than relying on operator care." },
  { answer: "Amdahl's Law", discipline: "Computer Engineering", accept: ["amdahls law", "amdahl law", "amdahl"], clues: ["A sobering law about diminishing returns.", "It applies when you throw more hardware at a problem.", "The serial fraction of the work sets a hard ceiling.", "Even with infinite processors, speedup converges to a finite number.", "Named after the architect of the IBM System/360."], reveal: "Speedup from parallelisation is limited by the fraction of a task that must remain sequential." },

  { answer: "Maxwell's Equations", discipline: "Electromagnetics", accept: ["maxwells equations", "maxwell equations", "maxwell"], clues: ["Four of them, and they fit on a T-shirt.", "They unified two forces previously thought separate.", "They predict a wave travelling at a very specific speed.", "That speed turned out to be the speed of light.", "Named after a Scottish physicist."], reveal: "The four equations governing electric and magnetic fields, unifying electricity, magnetism and light." },
  { answer: "Ideal Gas Law", discipline: "Thermodynamics", accept: ["ideal gas law", "pv nrt", "perfect gas law"], clues: ["An equation of state that is wrong everywhere but useful almost everywhere.", "It breaks down at high pressure and near condensation.", "Van der Waals wrote a correction to it.", "Four variables and one constant.", "PV = nRT."], reveal: "PV = nRT — relating pressure, volume, temperature and quantity for a gas with no intermolecular forces." },
  { answer: "Boundary Layer", discipline: "Fluid Mechanics", accept: ["boundary layer"], clues: ["A concept introduced by Prandtl in 1904 that rescued fluid dynamics.", "It is very thin, and everything interesting happens inside it.", "Outside it, you can pretend viscosity doesn't exist.", "It can be laminar, then transition, then become turbulent.", "When it separates, you get stall and a large drag increase."], reveal: "The thin region adjacent to a surface where viscous effects dominate and velocity rises from zero to freestream." },
  { answer: "Kármán Vortex Street", discipline: "Fluid Mechanics", accept: ["karman vortex street", "von karman vortex street", "vortex shedding", "karman vortex"], clues: ["A repeating pattern you can see in satellite photos of clouds behind islands.", "It has a characteristic frequency, described by the Strouhal number.", "It made the Tacoma Narrows bridge famous, though the full story is more complex.", "It's why tall chimneys have helical strakes wrapped around them.", "Alternating vortices shed from behind a bluff body."], reveal: "The alternating pattern of vortices shed from a bluff body, producing periodic side forces." },
  { answer: "Water Hammer", discipline: "Fluid Systems", accept: ["water hammer", "waterhammer", "hydraulic shock"], clues: ["You have heard it in a domestic plumbing system.", "It happens when momentum has nowhere to go.", "The pressure spike can exceed the pipe's rating many times over.", "Surge tanks and slow-closing valves are the standard mitigations.", "It's caused by a sudden change in fluid velocity."], reveal: "A pressure surge produced when a moving column of fluid is forced to stop or change direction suddenly." },
  { answer: "Venturi Effect", discipline: "Fluid Mechanics", accept: ["venturi effect", "venturi", "venturi meter"], clues: ["It relies on a deliberate constriction.", "It's a direct consequence of continuity plus Bernoulli.", "It's used to measure flow rate without any moving parts.", "It's how a paint sprayer and an aspirator draw fluid.", "Named after an 18th-century Italian physicist."], reveal: "The pressure drop that occurs when a fluid accelerates through a constricted section of pipe." },
  { answer: "Darcy-Weisbach Equation", discipline: "Fluid Mechanics", accept: ["darcy weisbach", "darcy weisbach equation", "darcy friction factor"], clues: ["It answers a question every pipework designer asks.", "It needs a dimensionless factor that depends on roughness and Reynolds number.", "You usually look that factor up on a chart, or solve Colebrook iteratively.", "Head loss goes with the square of velocity.", "It calculates friction pressure loss along a pipe."], reveal: "h_f = f (L/D)(v²/2g) — the friction head loss for flow through a pipe." },
  { answer: "Moody Chart", discipline: "Fluid Mechanics", accept: ["moody chart", "moody diagram"], clues: ["A single log-log plot that has appeared in every fluids textbook since 1944.", "The left region is a straight line; the right region flattens out.", "Curves are labelled with relative roughness.", "You enter with Reynolds number and read off a factor.", "That factor is the Darcy friction factor."], reveal: "The log-log chart giving the Darcy friction factor as a function of Reynolds number and relative pipe roughness." },
  { answer: "Stokes' Law", discipline: "Fluid Mechanics", accept: ["stokes law", "stokes drag"], clues: ["It applies only when inertia is negligible.", "Valid for Reynolds numbers well below one.", "Drag is proportional to velocity, not velocity squared.", "It gives you the terminal velocity of a settling particle.", "F = 6πμrv."], reveal: "The drag force on a small sphere in creeping viscous flow: F = 6πμrv." },
  { answer: "Magnus Effect", discipline: "Aerodynamics", accept: ["magnus effect", "magnus"], clues: ["Every sports commentator has described it without naming it.", "It requires both translation and rotation.", "It's why a topspin tennis ball dives and a curveball curves.", "Flettner built ships with spinning cylinders to exploit it.", "Spin creates a pressure difference and hence a side force."], reveal: "The lateral force generated on a spinning body moving through a fluid." },
  { answer: "Mach Number", discipline: "Aerodynamics", accept: ["mach number", "mach"], clues: ["Another dimensionless ratio.", "Below 0.3 you can usually pretend the fluid is incompressible.", "Near 1 the drag rises sharply — the so-called barrier.", "Above 5 the regime gets a new name entirely.", "Speed divided by local speed of sound."], reveal: "M = v/a — the ratio of flow speed to the local speed of sound, governing compressibility effects." },
  { answer: "Choked Flow", discipline: "Fluid Mechanics", accept: ["choked flow", "choking", "critical flow"], clues: ["Lower the downstream pressure further and nothing happens.", "It occurs at a specific area in the passage.", "It is why relief valve sizing has a sonic case.", "At the throat, Mach number reaches exactly one.", "Mass flow becomes independent of downstream conditions."], reveal: "The condition where flow reaches sonic velocity at the throat and mass flow rate no longer increases with reduced back pressure." },
  { answer: "Second Moment of Area", discipline: "Structural Engineering", accept: ["second moment of area", "area moment of inertia", "moment of inertia", "i value"], clues: ["Its units are length to the fourth power.", "It's why an I-beam is shaped the way it is.", "Move material away from the centre and it grows fast.", "It appears in both the bending stress and deflection equations.", "Symbol I, and often confused with the mass-based version."], reveal: "A geometric property describing how cross-sectional area is distributed about an axis, governing bending stiffness." },
  { answer: "Neutral Axis", discipline: "Structural Engineering", accept: ["neutral axis", "neutral plane"], clues: ["A line where nothing much happens.", "On one side of it fibres stretch; on the other they compress.", "For a symmetric elastic section it passes through the centroid.", "For reinforced concrete its position shifts as the section cracks.", "It's where bending stress is zero."], reveal: "The line in a bent section where longitudinal stress and strain are zero, separating tension from compression." },
  { answer: "Castigliano's Theorem", discipline: "Structural Engineering", accept: ["castiglianos theorem", "castigliano"], clues: ["An energy method, not a force-balance method.", "You differentiate a scalar quantity to get a vector one.", "It handles curved members and frames elegantly.", "You sometimes add a dummy load just to differentiate with respect to it.", "Partial derivative of strain energy gives deflection."], reveal: "Deflection at a point equals the partial derivative of total strain energy with respect to the load applied there." },
  { answer: "Influence Line", discipline: "Civil Engineering", accept: ["influence line", "influence lines"], clues: ["It answers a different question from a normal diagram.", "The load moves; the location of interest stays fixed.", "Müller-Breslau gave a neat way to sketch it.", "Bridge engineers use it constantly for moving traffic.", "It shows a response at one point as a unit load traverses the structure."], reveal: "A diagram showing how a response at a fixed point varies as a unit load moves across the structure." },
  { answer: "Prestressed Concrete", discipline: "Civil Engineering", accept: ["prestressed concrete", "prestressing", "post tensioning", "pre tensioning"], clues: ["It exploits the fact that one material is far better in one direction than the other.", "You deliberately introduce stress before any service load is applied.", "It comes in pre-tensioned and post-tensioned varieties.", "Losses from creep, shrinkage and relaxation must be accounted for.", "Freyssinet made it practical in the 1920s."], reveal: "Concrete with internal compressive stress deliberately introduced by tensioned tendons, offsetting service tensile stresses." },
  { answer: "Creep", discipline: "Materials", accept: ["creep", "creep deformation"], clues: ["It happens under a constant load, given enough time.", "It matters above roughly 0.4 of the melting temperature.", "Its curve has primary, secondary and tertiary stages.", "It's the life-limiting mechanism for turbine blades.", "Time-dependent plastic deformation below the yield stress."], reveal: "Slow, time-dependent plastic deformation of a material under sustained stress, accelerated by temperature." },
  { answer: "Paris' Law", discipline: "Fracture Mechanics", accept: ["paris law", "paris equation", "paris erdogan law"], clues: ["It concerns growth, not initiation.", "Plotted log-log, the middle region is a straight line.", "Its slope is the exponent m, typically around 3 for steels.", "The driving quantity is the stress intensity factor range.", "It predicts crack growth per cycle: da/dN."], reveal: "da/dN = C(ΔK)^m — the rate of fatigue crack growth per cycle as a function of stress intensity range." },
  { answer: "Fracture Toughness", discipline: "Fracture Mechanics", accept: ["fracture toughness", "kic", "k1c"], clues: ["It has slightly odd units: MPa times root metres.", "It is a material property, unlike stress intensity itself.", "Thicker specimens give lower values until plane strain is reached.", "Compare it against K to decide whether a crack will run.", "Its plane-strain symbol is K_IC."], reveal: "The critical stress intensity at which an existing crack propagates unstably — a material's resistance to fracture." },
  { answer: "Charpy Impact Test", discipline: "Materials Testing", accept: ["charpy", "charpy impact test", "charpy test"], clues: ["A swinging pendulum and a notched specimen.", "The result is measured in joules, from the height the pendulum recovers.", "It is comparative rather than a design input.", "Run it at several temperatures and you get a transition curve.", "The notch is a V, and the specimen is 10 mm square."], reveal: "A pendulum impact test measuring the energy absorbed by a notched specimen during fracture." },
  { answer: "Ductile-Brittle Transition Temperature", discipline: "Materials", accept: ["ductile brittle transition temperature", "dbtt", "ductile to brittle transition"], clues: ["It's a property of body-centred cubic metals, not of face-centred cubic ones.", "Cross it and the failure mode changes completely.", "It's why some WWII Liberty ships cracked in cold North Atlantic water.", "Charpy testing across a temperature range reveals it.", "Below it, steel fails with almost no plastic deformation."], reveal: "The temperature below which a metal's fracture mode shifts from ductile tearing to brittle cleavage." },
  { answer: "Work Hardening", discipline: "Materials", accept: ["work hardening", "strain hardening", "cold working"], clues: ["It happens as a side effect of forming.", "Dislocation density rises and they start blocking one another.", "Strength goes up; ductility goes down.", "It's why a paperclip snaps after you bend it back and forth.", "Annealing reverses it."], reveal: "The increase in strength and reduction in ductility caused by plastic deformation multiplying dislocations." },
  { answer: "Annealing", discipline: "Materials Processing", accept: ["annealing", "anneal"], clues: ["A heat treatment, though its goal is the opposite of most.", "Three stages: recovery, recrystallisation, grain growth.", "The cooling rate is deliberately slow.", "It relieves residual stress and restores ductility.", "It undoes the effects of cold working."], reveal: "Heating and slow-cooling a material to relieve internal stresses, soften it and restore ductility." },
  { answer: "Martensite", discipline: "Metallurgy", accept: ["martensite", "martensitic transformation"], clues: ["It forms without any diffusion at all.", "The transformation is essentially instantaneous.", "Its crystal structure is body-centred tetragonal, heavily distorted.", "It's extremely hard and extremely brittle, so tempering usually follows.", "It's what you get when you quench steel rapidly."], reveal: "The hard, supersaturated phase formed by rapid quenching of austenite, via a diffusionless shear transformation." },
  { answer: "Iron-Carbon Phase Diagram", discipline: "Metallurgy", accept: ["iron carbon phase diagram", "iron carbon diagram", "fe c diagram", "iron iron carbide diagram"], clues: ["A map with temperature up the side and composition along the bottom.", "It contains a eutectoid point at 0.76% and 727°C.", "Regions are labelled austenite, ferrite, cementite and pearlite.", "Beyond about 2.1% carbon you are talking about cast iron, not steel.", "It's the foundational chart of ferrous metallurgy."], reveal: "The equilibrium diagram mapping phases of iron and carbon against composition and temperature." },
  { answer: "Lever Rule", discipline: "Metallurgy", accept: ["lever rule"], clues: ["It's applied inside a two-phase region.", "You draw a horizontal line first, called a tie line.", "The name comes from an analogy with a balanced beam.", "The proportions come out as ratios of segment lengths.", "It tells you how much of each phase is present."], reveal: "A graphical method for calculating the relative proportions of two phases in equilibrium from a phase diagram." },
  { answer: "Galvanic Corrosion", discipline: "Materials", accept: ["galvanic corrosion", "bimetallic corrosion", "dissimilar metal corrosion"], clues: ["It needs three things: two of one, plus an electrolyte.", "A table ranks materials from noble to active.", "The area ratio matters enormously — small anodes are dangerous.", "It's why you don't bolt aluminium directly to stainless steel outdoors.", "Two dissimilar metals in electrical contact form a cell."], reveal: "Accelerated corrosion of the less noble metal when two dissimilar metals are electrically connected in an electrolyte." },
  { answer: "Hall-Petch Relationship", discipline: "Materials Science", accept: ["hall petch", "hall petch relationship", "hall petch equation"], clues: ["It relates a mechanical property to a microstructural feature.", "It involves an inverse square root.", "Grain boundaries impede dislocation movement.", "Smaller is stronger, until you get to the nanoscale and it inverts.", "It explains why grain refinement is a strengthening mechanism."], reveal: "σ_y = σ_0 + k/√d — yield strength increases as grain size decreases." },
  { answer: "Kirchhoff's Voltage Law", discipline: "Electrical Engineering", accept: ["kirchhoffs voltage law", "kvl", "kirchhoffs second law"], clues: ["The partner to a law you may already have seen here.", "It is conservation of energy applied to charge.", "It applies around a closed loop, not at a node.", "Go all the way round and you must end up where you started.", "Abbreviated with three letters, the middle one being V."], reveal: "The sum of voltage rises and drops around any closed loop in a circuit is zero." },
  { answer: "Thévenin's Theorem", discipline: "Electrical Engineering", accept: ["thevenins theorem", "thevenin", "thevenin equivalent"], clues: ["It lets you throw away almost an entire circuit.", "Whatever is behind the terminals gets replaced by two components.", "Its dual uses a current source and a parallel resistance instead.", "You find the resistance by killing all independent sources.", "A voltage source in series with a resistance."], reveal: "Any linear two-terminal network can be replaced by a single voltage source in series with a resistance." },
  { answer: "Maximum Power Transfer Theorem", discipline: "Electrical Engineering", accept: ["maximum power transfer theorem", "maximum power transfer", "impedance matching theorem"], clues: ["It is about power delivered, not efficiency — those two conflict here.", "At the optimum you only achieve 50% efficiency.", "It's why RF systems care about 50 ohms.", "It applies to the load relative to the source.", "The load should equal the source resistance."], reveal: "Maximum power is delivered to a load when load resistance equals the source's internal resistance." },
  { answer: "Lenz's Law", discipline: "Electromagnetics", accept: ["lenzs law", "lenz law", "lenz"], clues: ["It is essentially a statement about nature being contrary.", "It supplies a minus sign to another well-known law.", "Drop a magnet down a copper tube and watch it fall slowly.", "It's the operating principle of eddy current braking.", "The induced current opposes the change that created it."], reveal: "An induced current flows in the direction that opposes the change in magnetic flux producing it." },
  { answer: "Gauss's Law", discipline: "Electromagnetics", accept: ["gausss law", "gauss law", "gauss"], clues: ["One of the four great equations of electromagnetism.", "It concerns a closed surface, not a path.", "Symmetry makes it enormously powerful — otherwise it is unwieldy.", "It explains why a Faraday cage works.", "Total electric flux through a closed surface is proportional to enclosed charge."], reveal: "The electric flux through any closed surface equals the enclosed charge divided by permittivity." },
  { answer: "Power Factor", discipline: "Electrical Power", accept: ["power factor", "pf", "cos phi"], clues: ["A number between 0 and 1 that utilities charge you for.", "Motors and fluorescent ballasts drag it downward.", "Capacitor banks are installed specifically to correct it.", "It's the cosine of the phase angle between voltage and current.", "Real power divided by apparent power."], reveal: "The ratio of real power to apparent power in an AC circuit, reflecting phase displacement and harmonic distortion." },
  { answer: "Eddy Currents", discipline: "Electromagnetics", accept: ["eddy currents", "eddy current"], clues: ["They circulate in loops inside the material itself.", "They are a loss mechanism in transformers and motors.", "Laminating the core and adding silicon reduces them.", "They also make useful non-contact brakes and metal detectors.", "Induced by a changing magnetic field in a conductor."], reveal: "Circulating currents induced within a conductor by a changing magnetic field, causing resistive heating losses." },
  { answer: "Zener Diode", discipline: "Electronics", accept: ["zener diode", "zener"], clues: ["A component deliberately operated in a mode that would destroy its cousin.", "It works in reverse bias, past a designed breakdown point.", "You must always pair it with a series resistor.", "Its knee voltage is remarkably stable with current.", "Used as a simple voltage reference or clamp."], reveal: "A diode designed to conduct in reverse breakdown at a precise voltage, used for regulation and reference." },
  { answer: "Virtual Ground", discipline: "Electronics", accept: ["virtual ground", "virtual earth", "virtual short"], clues: ["It's a node that behaves like something it isn't connected to.", "It only exists when negative feedback is active.", "It follows from assuming infinite open-loop gain.", "It's why the inverting amplifier gain is just a ratio of two resistors.", "The two op-amp inputs are forced to the same potential."], reveal: "The op-amp inverting input held at the same potential as the non-inverting input by negative feedback, without a physical connection." },
  { answer: "Pulse Width Modulation", discipline: "Electronics", accept: ["pulse width modulation", "pwm"], clues: ["The output is only ever fully on or fully off.", "That's precisely why it's so efficient — no linear dissipation.", "The duty cycle carries the information.", "It's how you dim an LED and drive a motor from a microcontroller.", "Three letters, ending in M."], reveal: "Encoding an analogue level as the duty cycle of a fixed-frequency switching waveform." },
  { answer: "Schmitt Trigger", discipline: "Electronics", accept: ["schmitt trigger", "schmitt"], clues: ["It has two thresholds instead of one.", "The gap between them is deliberate, not a defect.", "It cleans up a slow or noisy edge into a crisp one.", "Its symbol contains a small hysteresis loop.", "Positive feedback around a comparator produces it."], reveal: "A comparator with hysteresis — separate rising and falling thresholds — used to reject noise on slow transitions." },
  { answer: "Karnaugh Map", discipline: "Digital Logic", accept: ["karnaugh map", "k map", "kmap", "karnaugh"], clues: ["A grid you fill with ones and zeros.", "Adjacent cells differ by exactly one bit — Gray code ordering.", "You group ones in powers of two, and groups may wrap around edges.", "Don't-care conditions can be used opportunistically.", "It minimises a Boolean expression graphically."], reveal: "A grid-based method for simplifying Boolean expressions by grouping adjacent minterms." },
  { answer: "De Morgan's Laws", discipline: "Digital Logic", accept: ["de morgans laws", "demorgans laws", "de morgan", "demorgan"], clues: ["Two identities that come as a matched pair.", "They let you convert between two gate types freely.", "Break the bar and change the sign, as the mnemonic goes.", "NAND and NOR gates are functionally complete because of them.", "Named after a 19th-century British logician."], reveal: "NOT(A AND B) = NOT A OR NOT B, and NOT(A OR B) = NOT A AND NOT B." },
  { answer: "Von Neumann Architecture", discipline: "Computer Engineering", accept: ["von neumann architecture", "von neumann", "stored program architecture"], clues: ["A structure proposed in a 1945 draft report.", "Its defining feature is treating two things as the same kind of thing.", "Harvard architecture is the usual alternative named alongside it.", "It suffers from a well-known bottleneck between processor and memory.", "Instructions and data share one memory and one bus."], reveal: "A computer design in which program instructions and data occupy the same memory and share one bus." },
  { answer: "Big O Notation", discipline: "Software Engineering", accept: ["big o notation", "big o", "asymptotic complexity", "time complexity"], clues: ["It deliberately throws away constants.", "It describes behaviour as the input grows without bound.", "Binary search is log n; bubble sort is n squared.", "It's an upper bound, not an exact count.", "Written with a capital letter and a pair of brackets."], reveal: "Asymptotic notation describing an upper bound on how an algorithm's cost grows with input size." },
  { answer: "Race Condition", discipline: "Software Engineering", accept: ["race condition", "race conditions", "data race"], clues: ["The bug that only appears on the customer's machine.", "It depends on timing you don't control.", "Adding a print statement often makes it disappear.", "Mutexes, atomics and locks exist to prevent it.", "Two threads access shared state and the outcome depends on ordering."], reveal: "A defect where correctness depends on the unpredictable relative timing of concurrent operations." },
  { answer: "Watchdog Timer", discipline: "Embedded Systems", accept: ["watchdog timer", "watchdog", "wdt"], clues: ["It's a counter that you must keep interrupting.", "The firmware has to 'kick' or 'feed' it periodically.", "If the main loop hangs, it stops being fed.", "The consequence is a hardware reset.", "Safety-critical embedded systems mandate it."], reveal: "A hardware timer that resets the system if software fails to service it, recovering from lockups." },
  { answer: "CAN Bus", discipline: "Embedded Systems", accept: ["can bus", "controller area network", "can"], clues: ["A two-wire differential bus, developed by Bosch in the 1980s.", "There is no addressing of nodes — messages carry identifiers instead.", "Arbitration is non-destructive: the lower identifier simply wins.", "It needs 120 ohm termination at both ends.", "It's in essentially every car built since the 1990s."], reveal: "A robust multi-master serial bus using message identifiers and non-destructive bitwise arbitration." },
  { answer: "Quantisation Error", discipline: "Signal Processing", accept: ["quantisation error", "quantization error", "quantisation noise", "quantization noise"], clues: ["It exists no matter how good your converter is.", "It is bounded by half of one step.", "Add a bit of resolution and it halves.", "Deliberately adding noise — dither — can improve perceived results.", "It's the difference between the true analogue value and its digital code."], reveal: "The unavoidable difference between an analogue value and its nearest digital representation, bounded by half an LSB." },
  { answer: "Laplace Transform", discipline: "Control Systems", accept: ["laplace transform", "laplace"], clues: ["It turns calculus into algebra.", "Differentiation becomes multiplication by a variable.", "Its variable is complex, usually written s.", "Transfer functions live in the domain it creates.", "Named after a French mathematician and astronomer."], reveal: "An integral transform mapping time-domain differential equations into algebraic equations in the complex s-domain." },
  { answer: "Kalman Filter", discipline: "Control Systems", accept: ["kalman filter", "kalman"], clues: ["It was used on the Apollo guidance computer.", "It is recursive — it never stores the whole history.", "It runs a predict step and an update step, forever.", "It optimally blends a model's prediction with a noisy measurement.", "It's the standard tool in sensor fusion and IMU processing."], reveal: "A recursive estimator producing optimal state estimates by weighting model predictions against noisy measurements." },
  { answer: "Fourier's Law of Heat Conduction", discipline: "Heat Transfer", accept: ["fouriers law", "fourier law", "fouriers law of heat conduction", "law of heat conduction"], clues: ["Same mathematical shape as Fick's and Ohm's laws.", "Flux is proportional to a gradient, with a minus sign.", "The constant of proportionality is a material property in W/mK.", "Heat flows down the gradient, never up it unaided.", "The gradient here is temperature."], reveal: "q = −k dT/dx — conductive heat flux is proportional to the negative temperature gradient." },
  { answer: "Stefan-Boltzmann Law", discipline: "Heat Transfer", accept: ["stefan boltzmann law", "stefan boltzmann"], clues: ["It concerns the third mode of heat transfer.", "It needs no medium at all.", "The dependence on temperature is startlingly strong.", "Emissivity scales it down for real, non-ideal surfaces.", "Power goes with absolute temperature to the fourth power."], reveal: "Radiated power per unit area from a black body is σT⁴, scaled by emissivity for real surfaces." },
  { answer: "Log Mean Temperature Difference", discipline: "Heat Transfer", accept: ["log mean temperature difference", "lmtd", "log mean temp difference"], clues: ["It exists because a simple average would be wrong.", "It applies across a device with two streams.", "Counterflow and parallel flow give different values from the same terminals.", "A correction factor F is applied for shell-and-tube geometries.", "It's the driving temperature difference in heat exchanger sizing."], reveal: "The logarithmically averaged temperature difference between two streams, used in Q = UA·ΔT_lm." },
  { answer: "Rankine Cycle", discipline: "Thermodynamics", accept: ["rankine cycle", "rankine"], clues: ["A practical cycle, unlike its idealised cousin.", "The working fluid changes phase twice per cycle.", "Pump, boiler, turbine, condenser.", "Reheat and regeneration are the standard efficiency improvements.", "It's the cycle behind almost every steam power station."], reveal: "The vapour power cycle using phase change of a working fluid through pump, boiler, turbine and condenser." },
  { answer: "Otto Cycle", discipline: "Thermodynamics", accept: ["otto cycle", "otto"], clues: ["Four processes, and in practice four strokes.", "Heat addition happens at constant volume.", "Its efficiency depends only on compression ratio and gamma.", "Knock is what limits how far you can push that ratio.", "It's the idealised cycle of a petrol engine."], reveal: "The ideal spark-ignition cycle with constant-volume heat addition; efficiency depends only on compression ratio." },
  { answer: "Brayton Cycle", discipline: "Thermodynamics", accept: ["brayton cycle", "brayton", "joule cycle"], clues: ["Compression, combustion, expansion — all continuous, not intermittent.", "Heat addition happens at constant pressure.", "Turbine inlet temperature is the key limit, set by blade materials.", "Its exhaust is hot enough to feed a second, different cycle.", "It's the cycle of a gas turbine or jet engine."], reveal: "The gas turbine cycle: adiabatic compression, constant-pressure heat addition, adiabatic expansion." },
  { answer: "Psychrometric Chart", discipline: "HVAC", accept: ["psychrometric chart", "psychrometrics", "psychrometric"], clues: ["A dense, curved chart that looks intimidating at first.", "Its saturation line runs up the left-hand side.", "Axes include dry bulb, wet bulb, and humidity ratio.", "You plot processes on it: heating, cooling, mixing, dehumidifying.", "It's the essential design tool for air conditioning."], reveal: "A chart plotting the thermodynamic properties of moist air, used to design air-conditioning processes." },
  { answer: "Le Chatelier's Principle", discipline: "Chemical Engineering", accept: ["le chateliers principle", "le chatelier", "lechatelier"], clues: ["A qualitative principle about systems that push back.", "It applies to a system already at equilibrium.", "Change pressure, temperature or concentration and it shifts.", "The shift always partially opposes the change you made.", "It's the basis of optimising the Haber process."], reveal: "A system at equilibrium responds to an imposed change by shifting so as to partially counteract that change." },
  { answer: "Arrhenius Equation", discipline: "Chemical Engineering", accept: ["arrhenius equation", "arrhenius"], clues: ["It contains an exponential and a temperature in the denominator.", "Plot the log against reciprocal temperature and you get a straight line.", "That slope gives you an activation energy.", "A rough rule of thumb: rate doubles every 10°C.", "It's also the basis of accelerated life testing."], reveal: "k = A·exp(−Ea/RT) — the temperature dependence of reaction rate through an activation energy." },
  { answer: "Manning's Equation", discipline: "Civil Engineering", accept: ["mannings equation", "manning equation", "mannings formula", "manning"], clues: ["It applies to flow with a free surface, not full pipes.", "It needs a roughness coefficient, n, looked up from tables.", "Hydraulic radius appears raised to the two-thirds power.", "It's empirical, not derived from first principles.", "Used for rivers, channels and storm drains."], reveal: "An empirical formula for velocity in open-channel flow: v = (1/n)R^(2/3)S^(1/2)." },
  { answer: "Hydraulic Jump", discipline: "Civil Engineering", accept: ["hydraulic jump"], clues: ["An abrupt, turbulent, visible transition in an open channel.", "You can see a small one in your kitchen sink.", "It dissipates a great deal of energy, which is often the point.", "Stilling basins below spillways are designed around it.", "Flow goes from supercritical to subcritical."], reveal: "The sudden rise in water depth as open-channel flow transitions from supercritical to subcritical, dissipating energy." },
  { answer: "Terzaghi Bearing Capacity", discipline: "Geotechnical Engineering", accept: ["terzaghi bearing capacity", "terzaghi", "bearing capacity"], clues: ["It concerns what the ground beneath a structure can take.", "The equation has three terms: cohesion, surcharge and self-weight.", "Each term carries a dimensionless factor dependent on friction angle.", "It assumes a general shear failure mechanism.", "Named after the father of soil mechanics."], reveal: "q_ult = cN_c + qN_q + 0.5γBN_γ — the ultimate bearing capacity of soil beneath a shallow foundation." },
  { answer: "Mohr-Coulomb Failure Criterion", discipline: "Geotechnical Engineering", accept: ["mohr coulomb", "mohr coulomb failure criterion", "mohr coulomb criterion"], clues: ["It combines two engineers' names from different centuries.", "It's a straight-line envelope tangent to a family of circles.", "Its intercept and slope have physical names.", "Those names are cohesion and angle of internal friction.", "It's the standard shear strength model for soil and rock."], reveal: "τ = c + σ tan φ — shear strength as a linear function of normal stress, via cohesion and friction angle." },
  { answer: "Failure Mode and Effects Analysis", discipline: "Reliability Engineering", accept: ["fmea", "failure mode and effects analysis", "failure modes and effects analysis"], clues: ["A structured, bottom-up workshop exercise.", "It's proactive: you do it before anything has failed.", "Three ratings get multiplied together.", "Those are severity, occurrence and detection.", "The product is called a risk priority number."], reveal: "A systematic method identifying potential failure modes, their effects, and prioritising them by risk priority number." },
  { answer: "Statistical Process Control", discipline: "Quality Engineering", accept: ["statistical process control", "spc", "control chart", "control charts"], clues: ["Developed by Walter Shewhart at Bell Labs in the 1920s.", "It distinguishes two fundamentally different sources of variation.", "Those are called common cause and special cause.", "Limits are drawn at three sigma, not at the specification.", "Reacting to common-cause variation is called tampering, and makes things worse."], reveal: "Monitoring a process with control charts to distinguish inherent variation from genuine, assignable disturbances." },
  { answer: "Tolerance Stack-Up", discipline: "Mechanical Design", accept: ["tolerance stack up", "tolerance stackup", "tolerance analysis", "stack up analysis"], clues: ["The reason an assembly fails even though every part passed inspection.", "The worst-case method is conservative and often uneconomic.", "The statistical method uses root-sum-square instead.", "You build a chain of dimensions from datum to feature.", "It predicts the accumulated variation across an assembly."], reveal: "Analysis of how individual part tolerances accumulate across an assembly to affect a critical dimension." },
  { answer: "Geometric Dimensioning and Tolerancing", discipline: "Mechanical Design", accept: ["gdt", "gd t", "geometric dimensioning and tolerancing", "gd&t"], clues: ["A symbolic language on a drawing, standardised as ASME Y14.5 and ISO 1101.", "It controls form, orientation, location and runout.", "Datums establish the frame everything is measured from.", "Maximum material condition can grant bonus tolerance.", "Its position control uses a circle with a cross in it."], reveal: "A symbolic drawing language specifying permissible variation in part geometry relative to defined datums." },
  { answer: "Takt Time", discipline: "Lean Manufacturing", accept: ["takt time", "takt"], clues: ["A German word borrowed into Japanese, then into English.", "It is set by the customer, not by the factory.", "It is not the same thing as cycle time.", "Line balancing aims to bring every station under it.", "Available production time divided by customer demand."], reveal: "The rate at which units must be produced to meet customer demand: available time divided by demand." },
  { answer: "Overall Equipment Effectiveness", discipline: "Manufacturing", accept: ["oee", "overall equipment effectiveness"], clues: ["A single percentage that plant managers watch closely.", "It's the product of three separate ratios.", "Those are availability, performance and quality.", "85% is considered world-class, which surprises people.", "Its three-letter abbreviation starts with O."], reveal: "OEE = availability × performance × quality — a composite measure of manufacturing productivity." },
  { answer: "V-Model", discipline: "Systems Engineering", accept: ["v model", "vee model", "v-model"], clues: ["Named for the shape you draw it in.", "The left-hand branch descends through decomposition.", "The right-hand branch ascends through integration.", "Each level on the left pairs with a test level on the right.", "It's mandated in automotive and aerospace development standards."], reveal: "A development lifecycle pairing each design decomposition stage with a corresponding verification stage." },
  { answer: "Technology Readiness Level", discipline: "Systems Engineering", accept: ["technology readiness level", "trl"], clues: ["A scale from 1 to 9, originally created by NASA.", "Level 1 is little more than an idea in a paper.", "Level 6 involves a demonstration in a relevant environment.", "Level 9 means flight-proven, in operational use.", "Funding bodies now use it to gate investment decisions."], reveal: "A 1–9 scale assessing the maturity of a technology from basic principles to proven operational use." },
  { answer: "Fault Tree Analysis", discipline: "Safety Engineering", accept: ["fault tree analysis", "fta", "fault tree"], clues: ["A deductive method, working in the opposite direction to FMEA.", "You start with the undesired outcome and work downward.", "The diagram uses AND and OR gates.", "Minimal cut sets identify the smallest combinations that cause failure.", "Developed at Bell Labs for the Minuteman missile programme."], reveal: "A top-down deductive method tracing an undesired top event to combinations of contributing basic failures." },
  { answer: "Mean Time Between Failures", discipline: "Reliability Engineering", accept: ["mtbf", "mean time between failures"], clues: ["A number often quoted in tens of thousands of hours.", "It applies to repairable items; a different acronym covers the rest.", "It assumes a constant failure rate, which is often untrue.", "It is emphatically not the same as service life.", "Its reciprocal is the failure rate, lambda."], reveal: "The average operating time between failures of a repairable system — the reciprocal of failure rate." },
  { answer: "Derating", discipline: "Reliability Engineering", accept: ["derating", "de rating"], clues: ["A deliberate decision to under-use something.", "It buys margin against temperature, voltage and current.", "A capacitor run at half its rated voltage lasts far longer.", "Military and space standards specify it explicitly.", "Operating a component below its maximum rating to improve reliability."], reveal: "Deliberately operating a component below its rated limits to extend life and increase reliability margin." },
  { answer: "Tsiolkovsky Rocket Equation", discipline: "Aerospace Engineering", accept: ["tsiolkovsky rocket equation", "rocket equation", "tsiolkovsky", "ideal rocket equation"], clues: ["It contains a natural logarithm, and that's the whole problem.", "It explains why rockets are almost entirely propellant.", "It's the reason for staging.", "It relates exhaust velocity and mass ratio to a change in speed.", "Δv = v_e ln(m_0/m_f)."], reveal: "Δv = v_e ln(m₀/m_f) — the velocity change achievable given exhaust velocity and mass ratio." },
  { answer: "Specific Impulse", discipline: "Aerospace Engineering", accept: ["specific impulse", "isp"], clues: ["A measure of efficiency, quoted confusingly in seconds.", "Chemical rockets manage a few hundred; ion thrusters manage thousands.", "It is exhaust velocity divided by standard gravity.", "Higher values mean less propellant for the same job.", "Abbreviated Isp."], reveal: "Thrust per unit propellant weight flow rate — a measure of rocket propellant efficiency, quoted in seconds." },
  { answer: "Hohmann Transfer Orbit", discipline: "Aerospace Engineering", accept: ["hohmann transfer", "hohmann transfer orbit", "hohmann"], clues: ["It uses exactly two engine burns.", "The path between them is an ellipse.", "It's the most propellant-efficient two-impulse route between circular orbits.", "Its cost is time — it is also the slowest.", "Named after a German engineer who published it in 1925."], reveal: "A two-burn elliptical transfer between coplanar circular orbits, minimising propellant at the cost of time." },
  { answer: "Hall Effect", discipline: "Sensors", accept: ["hall effect", "hall effect sensor", "hall sensor"], clues: ["Discovered in 1879, long before it was useful.", "It needs both a current and a perpendicular magnetic field.", "The result is a small voltage across the third axis.", "It gives you non-contact position and current sensing.", "It's how a brushless motor knows where its rotor is."], reveal: "A voltage generated across a current-carrying conductor when placed in a perpendicular magnetic field." },
  { answer: "Piezoelectric Effect", discipline: "Sensors", accept: ["piezoelectric effect", "piezoelectric", "piezo"], clues: ["It works in both directions, which makes it unusually useful.", "Quartz and PZT ceramic are the classic materials.", "It cannot measure a truly static load — the charge leaks away.", "It's in accelerometers, ultrasonic transducers and gas lighters.", "Mechanical stress produces an electric charge, and vice versa."], reveal: "The generation of electric charge in certain crystals under mechanical stress, and the reverse strain under applied voltage." },
  { answer: "Seebeck Effect", discipline: "Sensors", accept: ["seebeck effect", "seebeck", "thermoelectric effect"], clues: ["It requires a junction of two dissimilar materials.", "The output is only tens of microvolts per degree.", "You need cold junction compensation to make sense of it.", "Type K, type J and type T are the common variants.", "It's the operating principle of the thermocouple."], reveal: "A voltage generated across a junction of two dissimilar conductors held at different temperatures." },
  { answer: "Linear Variable Differential Transformer", discipline: "Sensors", accept: ["lvdt", "linear variable differential transformer"], clues: ["It has one primary and two secondary windings.", "A ferromagnetic core slides through the middle.", "It has effectively infinite resolution and no sliding contact to wear.", "The output nulls at the centre and reverses phase either side.", "A four-letter abbreviation for a displacement sensor."], reveal: "An inductive position sensor whose differential secondary output varies linearly with core displacement." },
  { answer: "Laser Triangulation", discipline: "Metrology", accept: ["laser triangulation", "triangulation", "laser displacement sensor"], clues: ["The sensor and the detector sit at a known angle to each other.", "The spot's position on the detector encodes the distance.", "Accuracy degrades on shiny, transparent or very dark surfaces.", "It's the basis of most laser profilers and 3D scanners.", "The geometry is literally a triangle."], reveal: "A non-contact ranging method deducing distance from the lateral position of a projected spot on a detector." },
  { answer: "Signal-to-Noise Ratio", discipline: "Instrumentation", accept: ["signal to noise ratio", "snr", "s n ratio"], clues: ["Usually quoted in decibels.", "Averaging N samples improves it by root N.", "Shielding, grounding and filtering all exist to raise it.", "Below about 1 you can no longer distinguish what you're measuring.", "It's the ratio of wanted signal power to unwanted noise power."], reveal: "The ratio of desired signal power to background noise power, typically expressed in decibels." },
  { answer: "Quadrature Encoder", discipline: "Sensors", accept: ["quadrature encoder", "incremental encoder", "encoder"], clues: ["It produces two square-wave outputs.", "They are deliberately offset by 90 degrees.", "That offset is what gives you direction, not just count.", "An index pulse provides a once-per-revolution reference.", "Counting all four edges gives you 4x resolution."], reveal: "A position sensor producing two 90°-offset pulse trains, giving both incremental count and direction of travel." },
  { answer: "Digital Twin", discipline: "Systems Engineering", accept: ["digital twin"], clues: ["The term became fashionable in the last decade, though the idea is older.", "It is not merely a CAD model — it's fed live data.", "It exists in parallel with a physical asset throughout its life.", "It's used for predictive maintenance and what-if simulation.", "The name is a metaphor about identical siblings."], reveal: "A live, data-connected virtual model of a physical asset, updated continuously through its operational life." },
  { answer: "HAZOP", discipline: "Process Safety", accept: ["hazop", "hazard and operability study"], clues: ["A structured, facilitated team review of a process design.", "It works through the plant node by node.", "It uses guide words applied to parameters.", "Guide words include NO, MORE, LESS, REVERSE and AS WELL AS.", "Developed by ICI in the 1960s for chemical plants."], reveal: "A systematic team review applying guide words to process parameters to identify hazards and operability problems." },
  { answer: "Pareto Principle", discipline: "Quality Engineering", accept: ["pareto principle", "pareto", "80 20 rule", "pareto chart"], clues: ["It began as an observation about land ownership in Italy.", "Juran applied it to quality and gave it a memorable slogan.", "That slogan is 'the vital few and the trivial many'.", "Its chart form is bars descending, with a cumulative line over them.", "Commonly stated as an 80/20 split."], reveal: "The observation that a small proportion of causes typically accounts for the large majority of effects." },
  { answer: "Impedance Matching", discipline: "Electrical Engineering", accept: ["impedance matching", "matched impedance"], clues: ["Get it wrong and part of your signal comes straight back at you.", "The mismatch is quantified by a reflection coefficient.", "Transmission line effects make it matter above a certain frequency.", "Stubs, transformers and L-networks are the usual tools.", "It's why RF and video systems specify 50 or 75 ohms."], reveal: "Designing source, line and load impedances to be equal so power transfers without reflection." },
];

/* ---------- Date helpers ---------- */
function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayNumber(d = new Date()) {
  const epoch = new Date(2024, 0, 1).getTime();
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.floor((today - epoch) / 86400000) + 1;
}
function todaysPuzzle() {
  const n = dayNumber();
  const i = ((n % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
  return { ...PUZZLES[i], number: n };
}

/* ---------- Answer matching ---------- */
function normalise(s) {
  return s
    .toLowerCase()
    .replace(/['\u2019`&]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bthe\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function isMatch(guess, puzzle) {
  const g = normalise(guess);
  if (!g) return false;
  const targets = [puzzle.answer, ...(puzzle.accept || [])].map(normalise);
  return targets.some((t) => g === t || levenshtein(g, t) <= Math.max(1, Math.floor(t.length * 0.12)));
}

const ALL_TERMS = PUZZLES.map((p) => p.answer).sort((a, b) => a.localeCompare(b));
const SKIP = "__skip__";

export default function Engineerdle() {
  const puzzle = useRef(todaysPuzzle()).current;
  const today = dateKey();

  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("playing");
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState({ played: 0, wins: 0, streak: 0, maxStreak: 0, lastPlayed: "" });
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const toastRef = useRef(null);
  const inputRef = useRef(null);

  const flash = (m, ms = 2000) => {
    setToast(m);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(""), ms);
  };

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const p = await store.get(`edle3:progress:${today}`);
        if (!dead && p && p.value) {
          const v = JSON.parse(p.value);
          setGuesses(v.guesses || []);
          setStatus(v.status || "playing");
        }
      } catch (e) { /* first play today */ }
      try {
        const s = await store.get("edle3:stats");
        if (!dead && s && s.value) setStats(JSON.parse(s.value));
      } catch (e) { /* no stats yet */ }
      if (!dead) setLoaded(true);
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(async (g, st) => {
    try {
      await store.set(`edle3:progress:${today}`, JSON.stringify({ guesses: g, status: st }));
    } catch (e) { /* ignore */ }
  }, [today]);

  const recordStats = useCallback((won) => {
    setStats((prev) => {
      if (prev.lastPlayed === today) return prev;
      const streak = won ? prev.streak + 1 : 0;
      const next = {
        played: prev.played + 1,
        wins: prev.wins + (won ? 1 : 0),
        streak,
        maxStreak: Math.max(prev.maxStreak, streak),
        lastPlayed: today,
      };
      store.set("edle3:stats", JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [today]);

  const suggestions = useMemo(() => {
    const q = normalise(input);
    if (!q || q.length < 2) return [];
    const already = new Set(guesses.filter((g) => g.text !== SKIP).map((g) => normalise(g.text)));
    return ALL_TERMS.filter((t) => normalise(t).includes(q) && !already.has(normalise(t))).slice(0, 5);
  }, [input, guesses]);

  // Commit a guess. isSkip bypasses the duplicate check so skips can repeat.
  const commit = (text, isSkip = false) => {
    if (status !== "playing") return;
    if (!isSkip) {
      if (!text.trim()) { flash("Type a term, or skip for the next clue"); return; }
      if (guesses.some((g) => g.text !== SKIP && normalise(g.text) === normalise(text))) {
        flash("Already guessed that one");
        return;
      }
    }
    const value = isSkip ? SKIP : text.trim();
    const correct = isSkip ? false : isMatch(value, puzzle);
    const next = [...guesses, { text: value, correct }];
    const done = correct || next.length >= MAX_GUESSES;
    const st = correct ? "won" : done ? "lost" : "playing";
    setGuesses(next);
    setInput("");
    setHighlight(-1);
    setStatus(st);
    persist(next, st);
    if (correct) { flash("Correct — nice call.", 2400); recordStats(true); }
    else if (done) { recordStats(false); }
    else { flash(isSkip ? `Skipped. Clue ${next.length + 1} unlocked.` : `Not it. Clue ${next.length + 1} unlocked.`); }
  };

  const cluesShown = Math.min(guesses.length + 1, MAX_GUESSES);
  const gameOver = status !== "playing";
  const remaining = MAX_GUESSES - guesses.length;

  const shareText = () => {
    const squares = guesses.map((g) => (g.correct ? "🟩" : g.text === SKIP ? "⬜" : "🟥")).join("");
    const pad = "⬛".repeat(Math.max(0, MAX_GUESSES - guesses.length));
    const score = status === "won" ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    return `ENGINEER·DLE #${puzzle.number} — ${puzzle.discipline}\n${score}\n${squares}${pad}`;
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      flash("Result copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch (e) { flash("Copy blocked — select the text manually"); }
  };

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box}
        input,button{font-family:inherit}
        .ed-btn:focus-visible,.ed-in:focus-visible,.ed-sug:focus-visible{outline:2px solid #4CC9F0;outline-offset:2px}
        .ed-in:focus{border-color:#4CC9F0 !important}
        .ed-sug:hover{background:#173C60 !important}
        .ed-learn:hover{background:#173C60 !important;border-color:#4CC9F0 !important;color:#EAF2FA !important}
        @keyframes edIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes edToast{from{opacity:0;transform:translate(-50%,6px)}to{opacity:1;transform:translate(-50%,0)}}
        .ed-anim{animation:edIn .28s ease both}
        @media (prefers-reduced-motion:reduce){.ed-anim{animation:none}}
        ::selection{background:#4CC9F0;color:#0B2A4A}
      `}</style>
      <div style={S.gridBg} aria-hidden="true" />

      <div style={S.frame}>
        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>DAILY ENGINEERING PUZZLE · No. {puzzle.number}</div>
            <div style={S.title}>ENGINEER·DLE</div>
          </div>
          <div style={S.iconRow}>
            <IconBtn label="How to play" onClick={() => setShowHelp(true)}>?</IconBtn>
            <IconBtn label="Statistics" onClick={() => setShowStats(true)}>▤</IconBtn>
          </div>
        </header>

        <div style={S.meta}>
          <Meta k="DISCIPLINE" v={puzzle.discipline} />
          <Meta k="ATTEMPTS USED" v={`${guesses.length} of ${MAX_GUESSES}`} />
        </div>

        <div style={S.clueStack}>
          {puzzle.clues.slice(0, cluesShown).map((c, i) => (
            <div
              key={i}
              className={i === cluesShown - 1 ? "ed-anim" : ""}
              style={{ ...S.clueCard, ...(i === cluesShown - 1 && !gameOver ? S.clueCardActive : {}) }}
            >
              <div style={S.clueNum}>{String(i + 1).padStart(2, "0")}</div>
              <div style={S.clueText}>{c}</div>
            </div>
          ))}
          {!gameOver &&
            Array.from({ length: MAX_GUESSES - cluesShown }).map((_, i) => (
              <div key={`lock${i}`} style={S.clueLocked}>
                <div style={{ ...S.clueNum, color: "#4A6A88" }}>{String(cluesShown + i + 1).padStart(2, "0")}</div>
                <div style={S.lockedText}>Locked</div>
              </div>
            ))}
        </div>

        {guesses.length > 0 && (
          <div style={S.history}>
            {guesses.map((g, i) => (
              <div
                key={i}
                style={{ ...S.histRow, borderColor: g.correct ? C.correct : g.text === SKIP ? C.border : C.wrong }}
              >
                <span style={{ ...S.histMark, color: g.correct ? C.correct : g.text === SKIP ? C.muted : C.wrong }}>
                  {g.correct ? "✓" : g.text === SKIP ? "–" : "✕"}
                </span>
                <span style={{ ...S.histText, color: g.text === SKIP ? C.muted : C.ink, fontStyle: g.text === SKIP ? "italic" : "normal" }}>
                  {g.text === SKIP ? "Skipped" : g.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {!gameOver && (
          <div style={S.inputZone}>
            <div style={{ position: "relative" }}>
              <input
                ref={inputRef}
                className="ed-in"
                style={S.input}
                value={input}
                placeholder="Name the concept, law or equation…"
                onChange={(e) => { setInput(e.target.value); setHighlight(-1); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 140)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, -1)); }
                  else if (e.key === "Escape") { setHighlight(-1); setFocused(false); }
                  else if (e.key === "Enter") {
                    e.preventDefault();
                    if (highlight >= 0 && suggestions[highlight]) {
                      // Fill the box; the player presses Enter again to submit.
                      setInput(suggestions[highlight]);
                      setHighlight(-1);
                    } else {
                      commit(input);
                    }
                  }
                }}
                autoComplete="off"
                aria-label="Your guess"
              />
              {focused && suggestions.length > 0 && (
                <div style={S.sugBox}>
                  {suggestions.map((s, i) => (
                    <div
                      key={s}
                      className="ed-sug"
                      role="button"
                      tabIndex={0}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setInput(s);          // fill only — do not submit
                        setHighlight(-1);
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      style={{ ...S.sug, background: i === highlight ? "#173C60" : "transparent" }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={S.btnRow}>
              <button className="ed-btn" style={S.primaryBtn} onClick={() => commit(input)}>SUBMIT GUESS</button>
              <button className="ed-btn" style={S.ghostBtn} onClick={() => commit("", true)}>
                SKIP{remaining > 1 ? "" : " (LAST)"}
              </button>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="ed-anim" style={{ ...S.result, borderColor: status === "won" ? C.correct : C.wrong }}>
            <div style={{ ...S.resultTag, color: status === "won" ? C.correct : C.wrong }}>
              {status === "won" ? `SOLVED ON ATTEMPT ${guesses.length}` : "NOT SOLVED"}
            </div>
            <div style={S.answerName}>{puzzle.answer}</div>
            <div style={S.answerBody}>{puzzle.reveal}</div>

            <div style={S.learnBlock}>
              <div style={S.learnLabel}>READ FURTHER</div>
              <div style={S.learnRow}>
                <a
                  className="ed-btn ed-learn"
                  style={S.learnLink}
                  href={`https://www.google.com/search?q=${encodeURIComponent(puzzle.answer + " engineering")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Search Google
                </a>
                <a
                  className="ed-btn ed-learn"
                  style={S.learnLink}
                  href={`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(puzzle.answer)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Wikipedia
                </a>
                <a
                  className="ed-btn ed-learn"
                  style={S.learnLink}
                  href={`https://scholar.google.com/scholar?q=${encodeURIComponent(puzzle.answer)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Scholar
                </a>
              </div>
            </div>

            <button className="ed-btn" style={S.primaryBtn} onClick={share}>{copied ? "COPIED ✓" : "SHARE RESULT"}</button>
            <div style={S.next}>New puzzle at midnight, your local time.</div>
          </div>
        )}
      </div>

      {toast && <div key={toast} style={S.toast}>{toast}</div>}

      {showHelp && (
        <Modal title="HOW TO PLAY" onClose={() => setShowHelp(false)}>
          <p style={S.mp}>Each day there's one engineering concept to identify — a law, a theory, an equation, a phenomenon, a method. Any discipline.</p>
          <p style={S.mp}>You start with one clue. Every wrong guess, and every skip, unlocks the next clue. The clues get progressively more obvious. You have {MAX_GUESSES} attempts in total, and a skip costs one of them.</p>
          <p style={S.mp}>Typing shows suggestions. Picking one fills the box — press Enter or Submit when you're ready. You can also submit anything you like; typos and alternative phrasings are accepted.</p>
          <p style={{ ...S.mp, color: C.muted }}>Solving on clue 1 is genuinely hard. Clue 3 is a respectable result.</p>
        </Modal>
      )}
      {showStats && (
        <Modal title="STATISTICS" onClose={() => setShowStats(false)}>
          <div style={S.statGrid}>
            <Stat v={stats.played} l="Played" />
            <Stat v={`${stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}%`} l="Solved" />
            <Stat v={stats.streak} l="Streak" />
            <Stat v={stats.maxStreak} l="Best streak" />
          </div>
        </Modal>
      )}

      {!loaded && <div style={S.veil}>LOADING TODAY'S PUZZLE…</div>}
    </div>
  );
}

function Meta({ k, v }) {
  return (
    <div style={S.metaCell}>
      <div style={S.metaK}>{k}</div>
      <div style={S.metaV}>{v}</div>
    </div>
  );
}
function IconBtn({ children, onClick, label }) {
  return <button className="ed-btn" aria-label={label} onClick={onClick} style={S.iconBtn}>{children}</button>;
}
function Stat({ v, l }) {
  return (
    <div style={S.statCell}>
      <div style={S.statV}>{v}</div>
      <div style={S.statL}>{l}</div>
    </div>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <span style={S.modalTitle}>{title}</span>
          <button className="ed-btn" style={S.modalX} onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const C = {
  bg: "#0B2A4A", panel: "#0F3255", ink: "#EAF2FA", muted: "#7FA8C9",
  border: "#3E5C78", accent: "#4CC9F0", correct: "#5FB489", wrong: "#E2795A",
};

const S = {
  page: { position: "relative", minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'IBM Plex Sans',sans-serif", display: "flex", justifyContent: "center", padding: "18px 12px 40px" },
  gridBg: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(140,190,230,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(140,190,230,.06) 1px,transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" },
  frame: { position: "relative", width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 14 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  eyebrow: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: ".14em", color: C.accent },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, marginTop: 2 },
  iconRow: { display: "flex", gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: "50%", border: `1px solid ${C.border}`, background: "transparent", color: C.ink, fontSize: 13, cursor: "pointer" },
  meta: { display: "flex", gap: 16, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "8px 0" },
  metaCell: { flex: 1, minWidth: 0 },
  metaK: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: ".1em", color: C.muted },
  metaV: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 12.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  clueStack: { display: "flex", flexDirection: "column", gap: 8 },
  clueCard: { display: "flex", gap: 12, padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: 4, background: "rgba(255,255,255,.02)" },
  clueCardActive: { borderColor: C.accent, background: "rgba(76,201,240,.07)" },
  clueLocked: { display: "flex", gap: 12, padding: "10px 14px", border: "1px dashed #2C4762", borderRadius: 4 },
  clueNum: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, color: C.accent, paddingTop: 1, flexShrink: 0 },
  clueText: { fontSize: 14.5, lineHeight: 1.5 },
  lockedText: { fontSize: 12.5, color: "#4A6A88", fontFamily: "'IBM Plex Mono',monospace" },
  history: { display: "flex", flexDirection: "column", gap: 5 },
  histRow: { display: "flex", gap: 10, alignItems: "center", padding: "7px 12px", border: "1px solid", borderRadius: 4, background: "rgba(0,0,0,.15)" },
  histMark: { fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 13 },
  histText: { fontSize: 13.5 },
  inputZone: { display: "flex", flexDirection: "column", gap: 8 },
  input: { width: "100%", padding: "13px 14px", borderRadius: 4, border: `1px solid ${C.border}`, background: "#0A2440", color: C.ink, fontSize: 15, outline: "none" },
  sugBox: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, zIndex: 20, overflow: "hidden" },
  sug: { padding: "10px 13px", fontSize: 13.5, cursor: "pointer", borderBottom: "1px solid rgba(62,92,120,.4)" },
  btnRow: { display: "flex", gap: 8 },
  primaryBtn: { flex: 2, padding: "12px 14px", borderRadius: 4, border: "none", background: C.accent, color: "#0B2A4A", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 12.5, letterSpacing: ".06em", cursor: "pointer" },
  ghostBtn: { flex: 1, padding: "12px 10px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, fontSize: 11, letterSpacing: ".05em", cursor: "pointer" },
  result: { border: "1px solid", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column", gap: 9, background: "rgba(255,255,255,.03)" },
  resultTag: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: ".14em", fontWeight: 700 },
  answerName: { fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 21, lineHeight: 1.2 },
  answerBody: { fontSize: 13.5, lineHeight: 1.55, color: C.muted },
  learnBlock: { borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 2 },
  learnLabel: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: ".12em", color: C.muted, marginBottom: 8 },
  learnRow: { display: "flex", gap: 7, flexWrap: "wrap" },
  learnLink: { flex: "1 1 auto", textAlign: "center", padding: "9px 12px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.accent, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, fontWeight: 600, letterSpacing: ".03em", textDecoration: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "background .15s, border-color .15s, color .15s" },
  next: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 10.5, color: C.muted, textAlign: "center" },
  toast: { position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", background: C.panel, border: `1px solid ${C.accent}`, padding: "9px 15px", borderRadius: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, zIndex: 60, animation: "edToast .2s ease" },
  veil: { position: "absolute", inset: 0, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: ".12em", color: C.muted },
  overlay: { position: "fixed", inset: 0, background: "rgba(4,14,25,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 },
  modal: { width: "100%", maxWidth: 400, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 18 },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: ".12em", color: C.accent },
  modalX: { background: "transparent", border: "none", color: C.ink, fontSize: 14, cursor: "pointer" },
  mp: { fontSize: 13.5, lineHeight: 1.55, margin: "0 0 10px" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  statCell: { border: `1px solid ${C.border}`, borderRadius: 4, padding: "12px 8px", textAlign: "center" },
  statV: { fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, fontSize: 22, color: C.accent },
  statL: { fontSize: 11, color: C.muted, marginTop: 4 },
};
