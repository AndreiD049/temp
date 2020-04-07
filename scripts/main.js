/* realize the drag-n-drop functionality for tasks */

// const tasks = document.querySelectorAll("div.task__item_border");

function taskOnMouseDown(e) {
    let fantomFrom = this.cloneNode(true);
    this.after(fantomFrom);
    fantomFrom.style.opacity = .2;
    this.style.width = this.getBoundingClientRect().width + "px";
    this.style.position = "absolute";
    let coords = getCoords(this);
    let shiftX = e.pageX - coords.left;
    let shiftY = e.pageY - coords.top;
    let target = this;
    // move the element under the mouse
    moveTo(this, e);

    // add another event listener
    document.addEventListener("mousemove", onMouseMove)

    document.addEventListener("mouseup", onMouseUp)
    
    
    function onMouseUp(e) {
        console.log("mouseup")
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        // check if item can be dropped here, if yes, append
        target.style = null;
        fantomFrom.parentNode.removeChild(fantomFrom);
    }

    function onMouseMove(e) {
        target.hidden = true;
        console.log(document.elementFromPoint(e.clientX, e.clientY).className);
        target.hidden = false;
        moveTo(target, e);
    }

    function moveTo(el, e) {
        el.style.left = e.pageX - shiftX + "px";
        el.style.top = e.pageY - shiftY + "px";
    }

    function getCoords(el) {
        // gets the coord in the document, together with scrolled offset
        let box = el.getBoundingClientRect();
        return {
            top: box.top + pageYOffset,
            left: box.left + pageXOffset,
        }
    }
}

// set the events for all tasks 
// tasks.forEach((task) => {
//     task.addEventListener("mousedown", taskOnMouseDown);
// })

class dragDropGroup {
    _defaultDragableSel = "[data-dragable]";
    _defaultDropableSel = "[data-dropable]";

    constructor(options) {
        this.options = options;
        this.dragableSelectors = options.dragableSelectors instanceof Array ?
                                 options.dragableSelectors : 
                                 [this._defaultDragableSel];
        this.dropableSelectors = options.dropableSelectors instanceof Array ? 
                                 options.dropableSelectors :
                                 [this._defaultDropableSel];

        this.init();
    }

    init() {
        // for all dropable elements set the needed events
        this.dropableSelectors.forEach(selector => {
            let elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.addEventListener("mousedown",  this.onMouseDown.bind(element, this));
            })
        })
    }

    onMouseDown(thisArg, e) {
        let target = thisArg.getValidDragable(e.target) 
        if (target) {
            // can be dragged
            let coords = thisArg.getCoords(target);
            // create a phantom element in the from container
            thisArg.createPhantomFrom(target);
            // set temporary styles so it can be dragged
            target.style.width = target.offsetWidth + "px";
            target.style.position = "absolute";
            let shiftX = e.pageX - coords.left;
            let shiftY = e.pageY - coords.top;

            try {
                thisArg.moveTo(target, e, shiftX, shiftY);

                // register the mouseMove event, we will need a reference to those functions in order to unregister the event
                thisArg.mouseMoveEvent = thisArg.onMouseMove.bind(target, thisArg, shiftX, shiftY);
                thisArg.mouseUpEvent = thisArg.onMouseUp.bind(target, thisArg);
                document.addEventListener("mouseup", thisArg.mouseUpEvent);
                document.addEventListener("mousemove", thisArg.mouseMoveEvent);
            } catch (e) {
                thisArg.cleanUp(target);
            }
        }
    }

    moveTo(el, e, shiftX, shiftY) {
        el.style.left = e.pageX - shiftX + "px";
        el.style.top = e.pageY - shiftY + "px";
    }

    onMouseUp(thisArg, e) {
        try {
            let elementUnder = thisArg.getElementUnderMouse(this, e.clientX, e.clientY);
            // check if the element is droppable
            let dropableParent = thisArg.getValidDropable(elementUnder);
            let dragableUnder = thisArg.getValidDragable(elementUnder);
            if (dropableParent && !dragableUnder) {
                // drop it in the parrent
                dropableParent.appendChild(this);
            } else if (dragableUnder) {
                thisArg.insertRelated(this, dragableUnder, e);
            }
        } finally {
            thisArg.cleanUp(this);
        }
    }

    onMouseMove(thisArg, shiftX, shiftY, e) {
        try {
            thisArg.moveTo(this, e, shiftX, shiftY);
            let elementUnder = thisArg.getElementUnderMouse(this, e.clientX, e.clientY);
            thisArg.createPhantomTo(elementUnder, this, e);
        } catch (e) {
            thisArg.cleanUp(this);
        }
    }

    getValidDragable(el) {
        for (let selector of this.dragableSelectors) {
            let result = el.closest(selector);
            if (result) {
                return result;
            }
        }
        return null;
    }

    getValidDropable(el) {
        for(let selector of this.dropableSelectors) {
            let result = el.closest(selector);
            if (result) {
                return result;
            }
        }
        return null;
    }

    createPhantomFrom(el) {
        // creates a Phantom element from
        if (this.options.phantomFrom) {
            var copy = el.cloneNode(true);
            copy.id = "__PHANTOM__EL__FROM__";
            if (this.options.phantomFromClass) {
                copy.classList.add(this.options.phantomFromClass);
            }
            el.after(copy);
        }
    }

    createPhantomTo(elUnder, el, e) {
        // creates a Phantom element to
        if (this.options.phantomTo) {
            let dragable = this.getValidDragable(elUnder);
            let dropable = this.getValidDropable(elUnder);

            let alreadyExists = document.getElementById("__PHANTOM__EL__TO__");
            if (alreadyExists) {
                copy = alreadyExists;
            } else {
                var copy = el.cloneNode(true);
                copy.style.position = null;
                copy.id = "__PHANTOM__EL__TO__"

                if (this.options.phantomToClass) {
                    copy.classList.add(this.options.phantomToClass);
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
            let elFrom = document.getElementById("__PHANTOM__EL__FROM__");
            if (dropable && dragable && dropable.contains(el)) {
                this.removeIfIdExists("__PHANTOM__EL__TO__");
                this.insertRelated(elFrom, dragable, e);
            } else if (dropable && dropable.contains(el)) {
                this.removeIfIdExists("__PHANTOM__EL__TO__");
                dropable.appendChild(elFrom);
            } else if (dropable && dragable && dragable.id !== "__PHANTOM__EL__TO__") {
                this.insertRelated(copy, dragable, e);
            } else if (dropable && !dropable.contains(el) && !dragable) {
                dropable.appendChild(copy);
            }
        }
    }

    removeIfIdExists(id) {
        let el = document.getElementById(id);
        if (el) el.remove();
    }

    getElementUnderMouse(el, x, y) {
        let result;
        el.hidden = true;
        result = document.elementFromPoint(x, y)
        el.hidden = false;
        return result;
    }

    insertRelated(el, relatedEl, e) {
        let coords = relatedEl.getBoundingClientRect();
        let clientMiddle = coords.top + relatedEl.clientHeight / 2;
        if (e.clientY < clientMiddle) {
            relatedEl.before(el);
        } else {
            relatedEl.after(el);
        }
    }

    getCoords(el) {
        // gets the coord in the document, together with scrolled offset
        let box = el.getBoundingClientRect();
        return {
            top: box.top + pageYOffset,
            left: box.left + pageXOffset,
        }
    }

    cleanUp(el) {
        // cleanup code
        let elTo = document.getElementById("__PHANTOM__EL__TO__");
        if (elTo) elTo.remove();
        let elFrom = document.getElementById("__PHANTOM__EL__FROM__");
        if (elFrom) elFrom.remove();
        el.style = null;
        document.removeEventListener("mousemove", this.mouseMoveEvent);
        document.removeEventListener("mouseup", this.mouseUpEvent);
    }
}

let dropGroup = new dragDropGroup({
    dragableSelectors: [".task__item_border"],
    dropableSelectors: [".tasks__container"],
    phantomFrom: true,
    phantomFromClass: "task__item_phantom",
    phantomTo: true,
    phantomToClass: "task__item_phantom",
});