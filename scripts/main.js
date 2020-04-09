function dragNDropGroup(options) {
    let state = {
        currentEvent: null,
        target: null,
        targetDropable: null,
        dragableUnder: null,
        dropableUnder: null,
        shiftX: 0,
        shiftY: 0,
        phantomFromId: options.phantomFromId || "__PHANTOM__EL__FROM__",
        phantomFrom: null,
        phantomToId: options.phantomToId || "__PHANTOM__EL__TO__",
        phantomTo: null,
    }

    // Starts
    validateOptions();
    initEventListeners();

    /* defining helper functions */

    function initEventListeners() {
        options.dropableSelectors.forEach(selector => {
            let elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.addEventListener("mousedown",  onMouseDown);
            })
        })
    }

    function onMouseDown(e) {
        try {
            updateState(e.target, e);
            setStyle();
            if (state.target) {
                createPhantomFrom();
                document.addEventListener("mouseup", onMouseUp, {once: true});
                document.addEventListener("mousemove", onMouseMove);
            }
        } catch (e) {
            console.error(e);
        } finally {
            destroyPhantoms();
        }
    }

    function onMouseMove(e) {
        try {
            updateState(state.target, e);
            moveTo(state.target, e);
            createPhantomTo();
        } catch (e) {
            console.error(e);
            cleanUp();
        }
    }

    function onMouseUp(e) {
        console.log("mouseup");
        try {
            if (state.dropableUnder) {
                if (state.dragableUnder) {
                    insertRelated(state.target, state.dragableUnder);
                } else {
                    state.dropableUnder.appendChild(state.target);
                }
            }
        } finally {
            cleanUp();
        }
    }

    function createPhantomFrom() {
        if (options.phantomFrom) {
            var copy = state.target.cloneNode(true);
            dropStyle(copy);
            copy.id = state.phantomFromId;
            if (options.phantomFromClass) {
                copy.classList.add(options.phantomFromClass);
            }
            state.target.after(copy);
            state.phantomFrom = copy;
        }
    }

    function createPhantomTo() {
        if (options.phantomTo && state.target) {
            let copy;
            if (state.phantomTo) {
                copy = state.phantomTo;
            } else {
                copy = state.target.cloneNode(true);
                dropStyle(copy);
                copy.id = state.phantomToId

                if (options.phantomToClass) {
                    copy.classList.add(options.phantomToClass);
                }
            }
            /*
            Scenarios:
            1. element under mouse is dragable and we are still in the same dropable
            2. element under mouse is the intial dropable, but we don't have a dragable under mouse
            3. element is dragable but we are in other dropable
            4. element is dropable, and is not the initial one, but we don't have any dragable under mouse
            5. else - do nothing.
            */
            if (state.dropableUnder) {
                if (state.dropableUnder.contains(state.target)) {
                    // we are still in the parent dropable
                    // remove any existing phantomTo in case it exist
                    if (state.phantomTo) {
                        state.phantomTo.remove();
                    }
                    if (!state.phantomFrom) {
                        createPhantomFrom();
                    }
                    if (state.dragableUnder) {
                        insertRelated(state.phantomFrom, state.dragableUnder);
                    } else {
                        state.dropableUnder.appendChild(state.phantomFrom);
                    }
                } else if (state.dropableUnder) {
                    // we are in a dropable, but not the original one
                    if (state.dragableUnder) {
                        insertRelated(copy, state.dragableUnder);
                    } else {
                        state.dropableUnder.appendChild(state.phantomTo);
                    }
                }
                state.phantomTo = copy;
            }
        }
    }

    // update the state according to the element passed as argument
    // supposedly we're now dragging this @el
    // @e is the mouse event we're currently checking
    function updateState(el, e) {
        if (!state.target) {
            state.target = getValidDragable(el);
        }
        if (!state.targetDropable) {
            state.targetDropable = getValidDropable(state.target);
        }
        if (!state.shiftX && !state.shiftY && state.target) {
            let coords = getCoords(state.target);
            state.shiftX = e.pageX - coords.left;
            state.shiftY = e.pageY - coords.top;
        }
        state.currentEvent = e;
        let elementUnder = getElementUnderMouse(e);
        state.dragableUnder = getValidDragable(elementUnder);
        state.dropableUnder = getValidDropable(elementUnder);
    }

    function dropState() {
        state.currentEvent = null;
        state.target = null;
        state.targetDropable = null;
        state.dragableUnder = null;
        state.dropableUnder = null;
        state.shiftX = 0;
        state.shiftY = 0;
        destroyPhantoms();
    }

    function validateOptions() {
        if (!options.dropableSelectors instanceof Array) {
            throw new Error("dropableSelectors should be an array of strings.");
        }

        if (!options.dragableSelectors instanceof Array) {
            throw new Error("dragableSelectors should be an array of strings");
        }
    }

    function moveTo(el, e) {
        el.style.left = e.pageX - state.shiftX + "px";
        el.style.top = e.pageY - state.shiftY + "px";
    }

    // get the closest dragable element
    function getValidDragable(target) {
        if (!target) {
            return null;
        }

        for (let selector of options.dragableSelectors) {
            let result = target.closest(selector);
            if (result) {
                return result;
            }
        }
        return null;
    }

    // get the closest dropable element
    function getValidDropable(target) {
        if (!target) {
            return null;
        }

        for(let selector of options.dropableSelectors) {
            let result = target.closest(selector);
            if (result) {
                return result;
            }
        }
        return null;
    }

    // @e is the mouse event we're checking
    function getElementUnderMouse(e) {
        if (!state.target) {
            return null;
        }
        let result;
        state.target.hidden = true;
        result = document.elementFromPoint(e.clientX, e.clientY)
        state.target.hidden = false;
        return result;
    }

    function setStyle(el) {
        let target = el || state.target;
        if (!target) {
            return null;
        }
        target.style.width = target.clientWidth + "px";
        target.style.position = "absolute";
    }

    function dropStyle(el) {
        let target = el || state.target;
        if (!target) {
            return null;
        }
        target.style.width = null;
        target.style.position = null;
        target.style.top = null;
        target.style.left = null;
    }

    function getCoords(el) {
        // gets the coord in the document, together with scrolled offset
        let box = el.getBoundingClientRect();
        return {
            top: box.top + pageYOffset,
            left: box.left + pageXOffset,
        }
    }

    function cleanUp() {
        dropStyle();
        dropState();
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("mousemove", onMouseMove);
    }
    
    function destroyPhantoms() {
        document.querySelectorAll("#" + state.phantomFromId).forEach(el => {
            el.remove();
        });
        document.querySelectorAll("#" + state.phantomToId).forEach(el => {
            el.remove();
        });
        state.phantomFrom = null;
        state.phantomTo = null;
    }

    function insertRelated(el, relatedEl) {
        let coords = relatedEl.getBoundingClientRect();
        let clientMiddle = coords.top + relatedEl.clientHeight / 2;
        if (state.currentEvent.clientY < clientMiddle) {
            relatedEl.before(el);
        } else {
            relatedEl.after(el);
        }
    }
}


dragNDropGroup({
    dragableSelectors: [".task__item_border"],
    dropableSelectors: [".tasks__container"],
    phantomFrom: true,
    phantomFromClass: "task__item_phantom",
    phantomTo: true,
    phantomToClass: "task__item_phantom",
});