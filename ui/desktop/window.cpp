#include <QWidget>
#include <QMouseEvent>

class Window : public QWidget {
    QPoint dragPos;
public:
    Window() {
        setWindowTitle("NAS-PRO Window");
        resize(300, 200);
    }

protected:
    void mousePressEvent(QMouseEvent *event) override {
        dragPos = event->globalPosition().toPoint() - frameGeometry().topLeft();
    }

    void mouseMoveEvent(QMouseEvent *event) override {
        move(event->globalPosition().toPoint() - dragPos);
    }
};
