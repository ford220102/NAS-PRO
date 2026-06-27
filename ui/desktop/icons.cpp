#include <QPushButton>
#include <QWidget>

class DesktopIcon : public QPushButton {
public:
    DesktopIcon(QString name, QWidget *parent = nullptr)
        : QPushButton(name, parent) {
        setFixedSize(100, 60);
    }
};
