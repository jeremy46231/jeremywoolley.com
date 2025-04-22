import Matter from '/lib/matter.js'
const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  MouseConstraint,
  Mouse,
  World,
  Events,
} = Matter

function activateGravityEffect(options = {}) {
  const config = {
    /** Which container holds the text to affect? */
    contentSelector: 'body',
    /** CSS class for the created word spans */
    wordClassName: 'physics-word',
    /** Stiffness for mouse dragging constraint */
    stiffness: 0.1,
    /** Bounciness of words (0-1) */
    wordRestitution: 0.6,
    /** Friction of words (0-1) */
    wordFriction: 0.05,
    /** Air resistance (0-1) */
    wordFrictionAir: 0.01,
    /** Mass per area */
    wordDensity: 0.001,
    /** How thick the invisible walls/floor are */
    boundaryThickness: 200,
    /** Multiplier for gravity strength */
    gravityScale: 1,
    ...options, // Allow overriding defaults
  }

  // Prevent conflicts
  window.stopStatusUpdate = true
  if (document.body.classList.contains('gravity-effect-active')) {
    console.warn('Gravity effect is already active.')
    return
  }
  console.log('Activating Gravity Effect...')
  document.body.classList.add('gravity-effect-active')

  // State Variables
  let engine, world, runner, mouseConstraint
  /** @type {{ element: HTMLElement, body: Matter.Body, initialRect: DOMRect }[]} */
  let wordObjects = []
  /** @type {{ ground: Matter.Body, leftWall: Matter.Body, rightWall: Matter.Body }} */
  let staticBoundaries = {
    ground: null,
    leftWall: null,
    rightWall: null,
  }
  let isEffectActive = true
  let oldWindowPos = { x: window.screenX, y: window.screenY }

  /**
   * Finds text nodes, splits them into words, wraps words in spans,
   * and prepares them for physics simulation.
   */
  function prepareHtmlForPhysics() {
    console.log('Preparing HTML...')
    const contentElement = document.querySelector(config.contentSelector)
    if (!contentElement) {
      console.error(
        `Content element not found with selector: ${config.contentSelector}`
      )
      isEffectActive = false
      document.body.classList.remove('gravity-effect-active')
      return false
    }

    wordObjects = [] // Reset
    const walker = document.createTreeWalker(
      contentElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )
    let node
    const nodesToReplace = []

    // First pass: Identify text nodes and prepare replacements
    while ((node = walker.nextNode())) {
      if (node.nodeValue.trim().length === 0) continue // Skip empty/whitespace-only nodes

      const parent = node.parentNode
      // Avoid processing text within script/style tags or already processed spans
      if (
        !(parent instanceof HTMLElement) ||
        parent.tagName === 'SCRIPT' ||
        parent.tagName === 'STYLE' ||
        !parent.checkVisibility() ||
        parent.classList.contains(config.wordClassName)
      ) {
        continue
      }

      const text = node.nodeValue
      // Split into words and whitespace (keeping spaces)
      const parts = text.split(/(\s+)/)
      const fragment = document.createDocumentFragment()
      let needsReplacement = false

      if (parts.length === 0) continue

      for (const part of parts) {
        if (part.trim().length === 0) {
          fragment.append(document.createTextNode(part)) // Preserve whitespace
          continue
        }
        const span = document.createElement('span')
        span.textContent = part
        span.classList.add(config.wordClassName)
        // Temporarily inline-block to measure correctly if word wraps
        span.style.display = 'inline-block'
        span.style.whiteSpace = 'nowrap' // Prevent internal wrapping during measurement
        fragment.appendChild(span)
        // We'll get the rect later, just store the element for now
        wordObjects.push({ element: span })
      }
      needsReplacement = true

      if (needsReplacement) {
        nodesToReplace.push({ oldNode: node, fragment: fragment })
      }
    }

    // Second pass: Perform replacements and get initial positions
    nodesToReplace.forEach(({ oldNode, fragment }) => {
      oldNode.parentNode.replaceChild(fragment, oldNode)
    })

    // Third pass: Get initial geometry and store it
    for (const item of wordObjects) {
      const span = item.element
      item.initialRect = span.getBoundingClientRect()
    }

    // Fourth pass: Apply absolute positioning styles with stored geometry
    for (const item of wordObjects) {
      const span = item.element
      // set up placeholder span
      /** @type {HTMLElement} */
      const placeholder = span.cloneNode(true)
      delete placeholder.id
      placeholder.classList.remove(config.wordClassName)
      placeholder.style.visibility = 'hidden'
      span.parentElement.insertBefore(placeholder, span)

      span.style.position = 'fixed'
      span.style.left = `${item.initialRect.left}px`
      span.style.top = `${item.initialRect.top}px`
      span.style.width = `${item.initialRect.width}px` // Set explicit width/height
      span.style.height = `${item.initialRect.height}px`
      span.style.margin = '0'
      span.style.transformOrigin = 'center center'
      span.style.display = '' // Reset display from inline-block
      span.style.whiteSpace = '' // Reset white-space
    }

    console.log(`Prepared ${wordObjects.length} words for physics.`)
    return true
  }

  /**
   * Sets up the Matter.js engine, world, runner, and static boundaries.
   */
  function setupPhysicsEngine() {
    console.log('Setting up Physics Engine...')
    engine = Engine.create()
    world = engine.world
    // Adjust gravity if needed
    world.gravity.y = config.gravityScale
    // Increase iterations for better stacking stability
    engine.positionIterations = 10
    engine.velocityIterations = 8

    runner = Runner.create()

    // Create large static boundaries initially, position updated later
    const thickness = config.boundaryThickness
    staticBoundaries.ground = Bodies.rectangle(0, 0, 10000, thickness, {
      isStatic: true,
      label: 'Ground',
    })
    staticBoundaries.leftWall = Bodies.rectangle(0, 0, thickness, 10000, {
      isStatic: true,
      label: 'LeftWall',
    })
    staticBoundaries.rightWall = Bodies.rectangle(0, 0, thickness, 10000, {
      isStatic: true,
      label: 'RightWall',
    })
    // Optional ceiling
    // staticBoundaries.ceiling = Bodies.rectangle(0, 0, 10000, thickness, { isStatic: true, label: 'Ceiling' });

    Composite.add(world, Object.values(staticBoundaries))
    updateBoundaries() // Set initial positions
  }

  /**
   * Updates the position and size of static boundaries based on window size/position.
   */
  function updateBoundaries() {
    if (!isEffectActive || !engine) return

    const w = window.innerWidth
    const h = window.innerHeight
    const thickness = config.boundaryThickness
    const halfThickness = thickness / 2

    const groundPos = windowToScreen({ x: w / 2, y: h + halfThickness })
    const leftWallPos = windowToScreen({ x: -halfThickness, y: h / 2 })
    const rightWallPos = windowToScreen({ x: w + halfThickness, y: h / 2 })
    // const ceilingPos = windowToScreen({ x: w / 2, y: -halfThickness });

    Body.setPosition(staticBoundaries.ground, groundPos)
    Body.setPosition(staticBoundaries.leftWall, leftWallPos)
    Body.setPosition(staticBoundaries.rightWall, rightWallPos)
    // Body.setPosition(staticBoundaries.ceiling, ceilingPos);

    // Optional: Adjust vertices if simple positioning isn't enough (usually not needed for thick boundaries)
    // Example for ground:
    // const groundVertices = [ { x: -w, y: 0 }, { x: w, y: 0 }, { x: w, y: thickness }, { x: -w, y: thickness } ];
    // Body.setVertices(staticBoundaries.ground, groundVertices.map(v => ({ x: v.x + groundPos.x, y: v.y + groundPos.y })));
    console.log('Boundaries updated')
  }

  /**
   * Creates Matter.js physics bodies corresponding to the prepared word spans.
   */
  function createWordBodies() {
    console.log('Creating physics bodies for words...')
    wordObjects.forEach((item) => {
      const { element, initialRect } = item
      if (!initialRect || initialRect.width === 0 || initialRect.height === 0) {
        console.warn(
          'Skipping word with invalid initialRect:',
          element.textContent
        )
        item.body = null // Mark as invalid
        element.style.display = 'none' // Hide it
        return
      }

      // Calculate initial center position in SCREEN coordinates
      const initialScreenCenter = windowToScreen({
        x: initialRect.left + initialRect.width / 2,
        y: initialRect.top + initialRect.height / 2,
      })

      const body = Bodies.rectangle(
        initialScreenCenter.x,
        initialScreenCenter.y,
        initialRect.width,
        initialRect.height,
        {
          restitution: config.wordRestitution,
          friction: config.wordFriction,
          frictionAir: config.wordFrictionAir,
          density: config.wordDensity,
          label: element.textContent.substring(0, 20), // Label for debugging
        }
      )

      item.body = body
      // Add a back-reference from the body to the element
      body.element = element
      body.initialRect = initialRect // Store rect on body for convenience in rendering

      Composite.add(world, body)
    })
    // Filter out any objects that failed to create a body
    wordObjects = wordObjects.filter((item) => item.body !== null)
  }

  /**
   * Adds mouse interaction (dragging) to the physics world.
   */
  function addMouseControl() {
    return
    console.log('Adding mouse control...')
    const mouse = Mouse.create(document.body) // Listen on body for mouse events

    // IMPORTANT: Set the initial offset based on screen position
    Mouse.setOffset(mouse, windowToScreen({ x: 0, y: 0 }))

    mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: config.stiffness,
        render: {
          visible: false, // Don't draw the line from mouse to object
        },
      },
    })

    Composite.add(world, mouseConstraint)
    // Optional: remove default Render.mouse lookup on mousemove
    mouseConstraint.mouse.element.removeEventListener("mousemove", mouseConstraint.mouse.mousemove);
    mouseConstraint.mouse.element.removeEventListener("touchstart", mouseConstraint.mouse.touchstart);
    mouseConstraint.mouse.element.removeEventListener("touchmove", mouseConstraint.mouse.touchmove);
  }

  /**
   * The main rendering loop using requestAnimationFrame.
   * Updates element positions and handles window movement checks.
   */
  function render() {
    if (!isEffectActive || !engine) return // Stop loop if effect deactivated

    // --- Check for Window Movement ---
    const currentWindowPos = { x: window.screenX, y: window.screenY }
    if (
      currentWindowPos.x !== oldWindowPos.x ||
      currentWindowPos.y !== oldWindowPos.y
    ) {
      console.log('Window moved')
      oldWindowPos = currentWindowPos
      updateBoundaries()
      // Update mouse constraint offset when window moves
      if (mouseConstraint) {
        Mouse.setOffset(mouseConstraint.mouse, currentWindowPos)
      }
    }

    // --- Update Word Element Styles ---
    wordObjects.forEach((item) => {
      const { element, body, initialRect } = item
      if (!body) return // Skip if body creation failed

      // Get physics body position (in screen coordinates)
      const bodyScreenPos = body.position
      // Convert back to window coordinates for CSS positioning
      const bodyWindowPos = screenToWindow(bodyScreenPos)

      // Calculate the top-left corner in window coordinates
      const topLeftX = bodyWindowPos.x - initialRect.width / 2
      const topLeftY = bodyWindowPos.y - initialRect.height / 2

      // Apply the transform relative to the initial absolute position
      // This moves the element from its initial spot (initialRect.left/top)
      // to the new physics spot (topLeftX/Y) and applies rotation.
      element.style.transform = `translate(${topLeftX - initialRect.left}px, ${
        topLeftY - initialRect.top
      }px) rotate(${body.angle}rad)`
    })

    // --- Request Next Frame ---
    requestAnimationFrame(render)
  }

  /**
   * Starts the physics simulation and the rendering loop.
   */
  function startSimulation() {
    if (!isEffectActive) return
    console.log('Starting simulation...')
    Runner.run(runner, engine)
    render() // Start the render loop
    console.log('Gravity Effect Activated!')

    // Add resize listener AFTER setup
    window.addEventListener('resize', updateBoundaries)
  }

  /**
   * Cleans up the effect (basic version - stops engine, removes listeners).
   * A full cleanup would also remove bodies and restore original DOM.
   */
  function cleanup() {
    console.log('Cleaning up Gravity Effect (basic)...')
    isEffectActive = false // Stops render loop
    if (runner) Runner.stop(runner)
    if (engine) Engine.clear(engine)
    if (mouseConstraint) World.remove(world, mouseConstraint) // Remove mouse constraint from world

    window.removeEventListener('resize', updateBoundaries)
    document.body.classList.remove('gravity-effect-active')

    // TODO: More thorough cleanup (remove bodies, restore original text nodes)
    // This requires storing the original node structure before prepareHtmlForPhysics
    wordObjects.forEach((item) => {
      if (item.element) item.element.remove() // Remove the created spans
    })
    // For a true undo, you'd need to re-insert the original text nodes saved earlier.
    wordObjects = []
    engine = world = runner = mouseConstraint = null
  }

  // --- Execution Flow ---
  if (prepareHtmlForPhysics()) {
    setupPhysicsEngine()
    createWordBodies()
    addMouseControl()
    startSimulation()

    // Provide a way to stop it (e.g., for development)
    window.deactivateGravityEffect = cleanup
  } else {
    console.error('Failed to prepare HTML. Gravity effect aborted.')
    document.body.classList.remove('gravity-effect-active')
  }
}

function windowToScreen({ x, y }) {
  return {
    x: x + window.screenX,
    y: y + window.screenY,
  }
}
function screenToWindow({ x, y }) {
  return {
    x: x - window.screenX,
    y: y - window.screenY,
  }
}

console.log(activateGravityEffect)
window.activateGravityEffect = activateGravityEffect
