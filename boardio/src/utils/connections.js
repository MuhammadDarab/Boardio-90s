class SocketUser {
  constructor({ id, color, name, showToast, nameTagRef }) {
    this.name = name;
    this.id = id;
    this.color = color;
    this.nameTagRef = nameTagRef;
    this.showToast = showToast;
    this.isHidden = false;
    this.showToast("Welcome " + this.name + "!!");
  }

  moveNameTag({ clientX, clientY }) {
    if (this.nameTagRef) {
      this.nameTagRef.current.style.top = clientY + "px";
      this.nameTagRef.current.style.left = clientX + "px";
    }
  }

  removeNameTag() {
    this.showToast("Goodbye " + this.name + ", Hope to see you soon!");
  }

  dissolveNameTag() {
    this.showToast(this.name + " Just opened a ticket!");
    this.isHidden = true;
  }

  resolveNameTag() {
    this.showToast(this.name + " is back from a ticket");
    this.isHidden = false;
  }
}

export default SocketUser;
