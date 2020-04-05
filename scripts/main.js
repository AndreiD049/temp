/* realize the drag-n-drop functionality for tasks */

const tasks = document.querySelectorAll("div.task__item_border");

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
        let box = el.getBoundingClientRect();
        return {
            top: box.top + pageYOffset,
            left: box.left + pageXOffset,
        }
    }
}

// set the events for all tasks 
tasks.forEach((task) => {
    task.addEventListener("mousedown", taskOnMouseDown);
})